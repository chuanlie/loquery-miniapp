Page({
  data: {
    loading: false,
    list: [],
    currentFilter: '待审核',
    filters: ['待审核', '已通过', '已驳回', '全部'],
    counts: { '待审核': 0, '已通过': 0, '已驳回': 0 },
    statusLabel: {
      pending:        '待审核',
      approved:       '已通过',
      rejected:       '已驳回',
      needs_evidence: '待补充',
    },
  },

  onLoad() { this.loadList() },
  onShow()  { this.loadList() },

  async seedData() {
    wx.showLoading({ title: '写入中...' })
    try {
      const res = await wx.cloud.callFunction({ name: 'queryRisk', data: { action: 'seed' } })
      wx.hideLoading()
      wx.showToast({ title: `成功写入 ${res.result.riskRecords} 条`, icon: 'success' })
      this.loadList()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '写入失败，请先部署 queryRisk', icon: 'none' })
    }
  },

  setFilter(e) {
    this.setData({ currentFilter: e.currentTarget.dataset.val })
    this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    const db = wx.cloud.database()
    const statusMap = { '待审核': 'pending', '已通过': 'approved', '已驳回': 'rejected' }
    const filter = this.data.currentFilter
    try {
      let query = db.collection('reports').orderBy('created_at', 'desc').limit(50)
      if (filter !== '全部') {
        query = db.collection('reports')
          .where({ status: statusMap[filter] || filter })
          .orderBy('created_at', 'desc')
          .limit(50)
      }
      const res = await query.get()

      // 计算各状态数量
      const allRes = await db.collection('reports').get()
      const counts = { '待审核': 0, '已通过': 0, '已驳回': 0 }
      allRes.data.forEach(r => {
        if (r.status === 'pending')  counts['待审核']++
        if (r.status === 'approved') counts['已通过']++
        if (r.status === 'rejected') counts['已驳回']++
      })

      const list = res.data.map(r => ({
        ...r,
        platformsText: (r.platforms || []).join(' / ') || '未填写',
        dateText: r.created_at ? r.created_at.slice(0, 10) : '',
      }))
      this.setData({ list, counts, loading: false })
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  approve(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认审核通过？',
      content: '通过后该账号将被收录进风险库，前台可搜索到。',
      confirmText: '确认通过',
      success: async ({ confirm }) => {
        if (!confirm) return
        try {
          const res = await wx.cloud.callFunction({ name: 'reviewReport', data: { action: 'approve', reportId: id } })
          console.log('reviewReport result:', JSON.stringify(res.result))
          if (res.result && res.result.success) {
            wx.showToast({ title: '已通过，已收录入库', icon: 'success' })
            this.loadList()
          } else {
            console.error('reviewReport failed:', res.result)
            wx.showToast({ title: '操作失败:' + (res.result && res.result.error || '未知'), icon: 'none' })
          }
        } catch (e) {
          console.error('reviewReport error:', e)
          wx.showToast({ title: '调用失败:' + (e.message || e), icon: 'none' })
        }
      }
    })
  },

  askEvidence(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '标记为"证据不足"？',
      content: '举报将保留但不收录，等待补充证据。',
      confirmText: '确认',
      success: async ({ confirm }) => {
        if (!confirm) return
        try {
          await wx.cloud.callFunction({ name: 'reviewReport', data: { action: 'pending', reportId: id, reason: '证据不足，待补充' } })
          wx.showToast({ title: '已标记', icon: 'none' })
          this.loadList()
        } catch (e) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },

  reject(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '驳回此举报？',
      editable: true,
      placeholderText: '请输入驳回理由（可选）',
      confirmText: '确认驳回',
      success: async ({ confirm, content }) => {
        if (!confirm) return
        try {
          await wx.cloud.callFunction({ name: 'reviewReport', data: { action: 'reject', reportId: id, reason: content || '内容不符合收录标准' } })
          wx.showToast({ title: '已驳回', icon: 'none' })
          this.loadList()
        } catch (e) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  },
})
