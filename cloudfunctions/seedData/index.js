const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 种子 risk_records（已审核通过，前台可搜索）
const riskRecords = [
  {
    account_type: '咸鱼', account_id: 'xianyu_scammer_88',
    nickname: '萝莉塔小铺旗舰', subject_name: '', risk_level: 'high',
    issue_type: '收款后不发货/跑路', platform: '咸鱼',
    report_count: 5, amount: 3200, last_date: '2026-01',
    source: 'fan_report', source_detail: '视频：Lo圈防骗第3期',
    display_status: 'yes',
    desc: '用户反映该账号收款后失联，多名买家付款后商品未发出，涉及金额约3200元。',
    basis: '5条举报截图+买家群聊记录', note: '测试数据',
    created_at: '2026-01-10T08:00:00.000Z',
  },
  {
    account_type: '微信', account_id: 'wx_fake_jk999',
    nickname: 'JK制服批发小姐姐', subject_name: '', risk_level: 'mid',
    issue_type: '引流微信私下转账', platform: '微信私下',
    report_count: 2, amount: 800, last_date: '2026-02',
    source: 'fan_report', source_detail: '用户私信举报 2026-02-15',
    display_status: 'yes',
    desc: '用户反映被引导加微信私下付款，转账后对方将其拉黑，涉及JK制服款式。',
    basis: '2条私信截图', note: '测试数据',
    created_at: '2026-02-15T10:00:00.000Z',
  },
  {
    account_type: '小红书', account_id: 'lolita_shop_fake',
    nickname: 'Lolita梦幻精品屋', subject_name: '', risk_level: 'high',
    issue_type: '假货/以次充好', platform: '小红书',
    report_count: 8, amount: 5600, last_date: '2026-03',
    source: 'creator_video', source_detail: '博主视频：Lo圈打假合集',
    display_status: 'yes',
    desc: '用户反映该账号以正品价格出售山寨品牌Lo裙，实物与宣传图严重不符。',
    basis: '买家实拍对比图+8份投诉记录', note: '测试数据',
    created_at: '2026-03-01T08:00:00.000Z',
  },
]

// 种子 reports（待审核举报）
const reports = [
  {
    platforms: ['咸鱼'], account_id: 'test_pending_seller',
    issue_types: ['收款不发货', '跑路失联'],
    desc: '我在闲鱼购买了一件价值420元的洋装，付款后卖家已读不回，一周后直接删除商品，无法联系。',
    contact: 'wx_buyer_test', images: [], other_issue: '',
    status: 'pending', created_at: new Date().toISOString(),
  },
]

exports.main = async (event) => {
  const { action, records = [] } = event || {}

  if (action === 'importRiskRecords') {
    let imported = 0
    let skipped = 0

    for (const raw of records) {
      const accountType = (raw.account_type || '').trim()
      const accountId = (raw.account_id || '').trim()
      if (!accountType || !accountId) continue

      const dup = await db.collection('risk_records')
        .where({ account_type: accountType, account_id: accountId })
        .limit(1)
        .get()

      if (dup.data.length) {
        skipped += 1
        continue
      }

      const record = {
        account_type: accountType,
        account_id: accountId,
        nickname: raw.nickname || '',
        subject_name: raw.subject_name || '',
        risk_level: raw.risk_level || 'low',
        issue_type: raw.issue_type || '其他',
        platform: raw.platform || '',
        report_count: Number(raw.report_count) || 1,
        amount: Number(raw.amount) || 0,
        last_date: raw.last_date || '',
        source: raw.source || '创始人整理',
        source_detail: raw.source_detail || '',
        display_status: raw.display_status === 'yes' ? 'yes' : 'no',
        desc: raw.desc || '',
        basis: raw.basis || '',
        note: raw.note || '来自录入工具导入',
        created_at: raw.created_at || new Date().toISOString(),
      }

      await db.collection('risk_records').add({ data: record })
      imported += 1
    }

    return { success: true, imported, skipped }
  }

  const riskIds = []
  for (const r of riskRecords) {
    const res = await db.collection('risk_records').add({ data: r })
    riskIds.push(res._id)
  }
  const reportIds = []
  for (const r of reports) {
    const res = await db.collection('reports').add({ data: r })
    reportIds.push(res._id)
  }
  return { riskRecords: riskIds.length, reports: reportIds.length }
}
