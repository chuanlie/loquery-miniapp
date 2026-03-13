const db = wx.cloud.database()

Page({
  data: {
    keyword: '',
    currentPlatform: '全部',
    platforms: ['全部', '咸鱼', '微信', 'QQ', '支付宝', '小红书', '微博'],
    loading: false,
    stats: { total: 0, high: 0, mid: 0 },
  },

  onLoad() {
    this.loadStats()
  },

  async loadStats() {
    try {
      const res = await wx.cloud.callFunction({ name: 'queryRisk', data: { action: 'stats' } })
      this.setData({ stats: res.result })
    } catch (e) {
      console.error('加载统计失败', e)
    }
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  selectPlatform(e) {
    this.setData({ currentPlatform: e.currentTarget.dataset.platform })
  },

  async onSearch() {
    const { keyword, currentPlatform } = this.data
    if (!keyword.trim()) {
      wx.showToast({ title: '请输入账号或昵称', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'queryRisk',
        data: {
          action: 'search',
          keyword: keyword.trim(),
          platform: currentPlatform === '全部' ? '' : currentPlatform,
        }
      })
      wx.navigateTo({
        url: `/pages/result/result?keyword=${encodeURIComponent(keyword)}&data=${encodeURIComponent(JSON.stringify(res.result))}`
      })
    } catch (e) {
      wx.showToast({ title: '查询失败，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
