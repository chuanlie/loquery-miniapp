const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const SEED_RECORDS = [
  { account_type: '咸鱼', account_id: 'xianyu_scammer_88', nickname: '萝莉塔小铺旗舰', risk_level: 'high', issue_type: '收款后不发货/跑路', platform: '咸鱼', report_count: 5, amount: 3200, last_date: '2026-01', display_status: 'yes', desc: '用户反映该账号收款后失联，多名买家付款后商品未发出，涉及金额约3200元。', created_at: '2026-01-10T08:00:00.000Z' },
  { account_type: '微信', account_id: 'wx_fake_jk999', nickname: 'JK制服批发小姐姐', risk_level: 'mid', issue_type: '引流微信私下转账', platform: '微信私下', report_count: 2, amount: 800, last_date: '2026-02', display_status: 'yes', desc: '用户反映被引导加微信私下付款，转账后对方将其拉黑，涉及JK制服款式。', created_at: '2026-02-15T10:00:00.000Z' },
  { account_type: '小红书', account_id: 'lolita_shop_fake', nickname: 'Lolita梦幻精品屋', risk_level: 'high', issue_type: '假货/以次充好', platform: '小红书', report_count: 8, amount: 5600, last_date: '2026-03', display_status: 'yes', desc: '用户反映该账号以正品价格出售山寨品牌Lo裙，实物与宣传图严重不符。', created_at: '2026-03-01T08:00:00.000Z' },
]
const SEED_REPORTS = [
  { platforms: ['咸鱼'], account_id: 'test_pending_seller', issue_types: ['收款不发货', '跑路失联'], desc: '付款后卖家已读不回，一周后直接删除商品，无法联系。', contact: 'wx_test', images: [], status: 'pending', created_at: new Date().toISOString() },
]

exports.main = async (event) => {
  const { action, keyword, platform } = event

  // 写入测试数据（仅调试用，正式上线前可删除此 action）
  if (action === 'seed') {
    const riskIds = []
    for (const r of SEED_RECORDS) {
      const res = await db.collection('risk_records').add({ data: r })
      riskIds.push(res._id)
    }
    const reportIds = []
    for (const r of SEED_REPORTS) {
      const res = await db.collection('reports').add({ data: r })
      reportIds.push(res._id)
    }
    return { ok: true, riskRecords: riskIds.length, reports: reportIds.length }
  }

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
