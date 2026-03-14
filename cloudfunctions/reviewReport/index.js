const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { action, reportId, reason } = event
  if (!reportId) return { success: false, error: 'missing reportId' }

  // 取举报记录
  const reportSnap = await db.collection('reports').doc(reportId).get()
  const report = reportSnap.data

  if (action === 'approve') {
    // 1. 将举报转为 risk_record
    const record = {
      account_type:   report.platforms?.[0] || 'other',
      account_id:     report.account_id || '',
      nickname:       '',
      subject_name:   '',
      risk_level:     'high',
      issue_type:     report.issue_types?.[0] || '其他',
      platform:       (report.platforms || []).join('/'),
      report_count:   1,
      amount:         0,
      last_date:      new Date().toISOString().slice(0, 7),
      source:         'fan_report',
      source_detail:  `举报ID: ${reportId}`,
      display_status: 'yes',
      desc:           report.desc || '',
      basis:          report.other_issue || '',
      note:           `审核通过，原始举报ID: ${reportId}`,
      images:         report.images || [],
      created_at:     new Date().toISOString(),
    }
    const addRes = await db.collection('risk_records').add({ data: record })

    // 2. 更新举报状态
    await db.collection('reports').doc(reportId).update({
      data: { status: 'approved', risk_record_id: addRes._id, reviewed_at: new Date().toISOString() }
    })
    return { success: true, action: 'approved', riskRecordId: addRes._id }
  }

  if (action === 'reject') {
    await db.collection('reports').doc(reportId).update({
      data: { status: 'rejected', reject_reason: reason || '', reviewed_at: new Date().toISOString() }
    })
    return { success: true, action: 'rejected' }
  }

  if (action === 'pending') {
    await db.collection('reports').doc(reportId).update({
      data: { status: 'pending', reject_reason: reason || '', reviewed_at: new Date().toISOString() }
    })
    return { success: true, action: 'pending' }
  }

  return { success: false, error: 'unknown action' }
}
