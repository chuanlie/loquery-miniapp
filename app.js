App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'loquery-prod',  // 云环境ID，创建后替换
        traceUser: true,
      })
    }
  },
  globalData: {}
})
