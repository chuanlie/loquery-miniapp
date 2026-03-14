const PLATFORM_MAP = {
  xianyu: '闲鱼', wechat: '微信', qq: 'QQ',
  weibo: '微博', taobao: '淘宝', alipay: '支付宝', other: '其他'
}
const RISK_LABEL = { high: '高风险', mid: '中风险', low: '低风险' }

Page({
  data: {
    keyword: '',
    records: [],
    totalVictims: 0,
    totalAmountText: '',
    queryDate: '',
  },

  onLoad(options) {
    const keyword = decodeURIComponent(options.keyword || '')
    const raw = JSON.parse(decodeURIComponent(options.data || '[]'))

    const records = raw.map(r => ({
      ...r,
      platformLabel: PLATFORM_MAP[r.account_type] || r.account_type || '',
      riskLabel: RISK_LABEL[r.risk_level] || '待观察',
    }))

    const totalVictims = records.reduce((s, r) => s + (r.report_count || 1), 0)
    const totalAmount = records.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    const totalAmountText = totalAmount > 0
      ? '¥' + totalAmount.toLocaleString('zh-CN')
      : '不详'

    const now = new Date()
    const queryDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

    this.setData({ keyword, records, totalVictims, totalAmountText, queryDate })
    wx.setNavigationBarTitle({ title: keyword ? `查询：${keyword}` : '查询结果' })
  },

  goBack() {
    wx.navigateBack()
  },

  goReport() {
    wx.navigateTo({ url: '/pages/report/report' })
  },
})
