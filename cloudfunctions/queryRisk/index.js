const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { action, keyword, platform } = event

  // 统计数据
  if (action === 'stats') {
    const [total, high, mid] = await Promise.all([
      db.collection('risk_records').where({ display_status: 'yes' }).count(),
      db.collection('risk_records').where({ display_status: 'yes', risk_level: 'high' }).count(),
      db.collection('risk_records').where({ display_status: 'yes', risk_level: 'mid' }).count(),
    ])
    return { total: total.total, high: high.total, mid: mid.total }
  }

  // 搜索
  if (action === 'search') {
    const kw = (keyword || '').toLowerCase().trim()
    if (!kw) return []

    let query = db.collection('risk_records')
      .where({
        display_status: 'yes',
        // 用正则模糊匹配 account_id 或 nickname
        _id: _.exists(true), // placeholder，下面用 or 覆盖
      })

    // 用 or 匹配 account_id 和 nickname
    let whereClause = {
      display_status: 'yes',
      ...( platform ? { account_type: platform } : {} ),
    }

    // 分别查 account_id 和 nickname，合并去重
    const [r1, r2] = await Promise.all([
      db.collection('risk_records')
        .where({ ...whereClause, account_id: db.RegExp({ regexp: kw, flags: 'i' }) })
        .limit(20).get(),
      db.collection('risk_records')
        .where({ ...whereClause, nickname: db.RegExp({ regexp: kw, flags: 'i' }) })
        .limit(20).get(),
    ])

    // 合并去重
    const map = new Map()
    ;[...r1.data, ...r2.data].forEach(r => map.set(r._id, r))

    // 按风险等级排序：high > mid > low
    const order = { high: 0, mid: 1, low: 2 }
    return [...map.values()].sort((a, b) => (order[a.risk_level] ?? 3) - (order[b.risk_level] ?? 3))
  }

  return []
}
