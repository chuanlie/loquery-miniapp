Page({
  data: {
    keyword: '',
    records: [],
  },

  onLoad(options) {
    const keyword = decodeURIComponent(options.keyword || '')
    const records = JSON.parse(decodeURIComponent(options.data || '[]'))
    this.setData({ keyword, records })
    wx.setNavigationBarTitle({ title: `查询：${keyword}` })
  },

  goBack() {
    wx.navigateBack()
  },

  goReport() {
    wx.navigateTo({ url: '/pages/report/report' })
  },
})
