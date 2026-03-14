Page({
  data: {
    platforms: ['咸鱼', '微信', 'QQ', '支付宝', '小红书', '微博', '其他'],
    issueTypes: ['收款不发货', '假货/以次充好', '跑路失联', '骚扰恐吓', '虚假宣传', '其他'],
    selectedPlatforms: [],
    activePlatforms: {},
    selectedIssues: [],
    activeIssues: {},
    mainAccountId: '',
    otherIssue: '',
    desc: '',
    contact: '',
    images: [],
    submitting: false,
  },

  togglePlatform(e) {
    const val = e.currentTarget.dataset.val
    const list = [...this.data.selectedPlatforms]
    const idx = list.indexOf(val)
    if (idx > -1) { list.splice(idx, 1) } else { list.push(val) }
    const activePlatforms = {}
    list.forEach(p => { activePlatforms[p] = true })
    this.setData({ selectedPlatforms: list, activePlatforms })
  },

  onMainAccountInput(e) { this.setData({ mainAccountId: e.detail.value }) },
  toggleIssue(e) {
    const val = e.currentTarget.dataset.val
    const list = [...this.data.selectedIssues]
    const idx = list.indexOf(val)
    if (idx > -1) { list.splice(idx, 1) } else { list.push(val) }
    const activeIssues = {}
    list.forEach(p => { activeIssues[p] = true })
    this.setData({ selectedIssues: list, activeIssues })
  },

  onDescInput(e) { this.setData({ desc: e.detail.value }) },
  onOtherInput(e) { this.setData({ otherIssue: e.detail.value }) },
  onContactInput(e) { this.setData({ contact: e.detail.value }) },

  chooseImage() {
    const remaining = 20 - this.data.images.length
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImgs = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ images: [...this.data.images, ...newImgs] })
      }
    })
  },

  delImage(e) {
    const imgs = [...this.data.images]
    imgs.splice(e.currentTarget.dataset.idx, 1)
    this.setData({ images: imgs })
  },

  async onSubmit() {
    const { selectedPlatforms, selectedIssues, mainAccountId, desc, contact, images, otherIssue } = this.data
    if (selectedPlatforms.length === 0) {
      wx.showToast({ title: '请选择风险账号平台', icon: 'none' }); return
    }
    if (!mainAccountId.trim()) {
      wx.showToast({ title: '请输入账号ID / 号码', icon: 'none' }); return
    }
    if (selectedIssues.length === 0) {
      wx.showToast({ title: '请选择问题类型', icon: 'none' }); return
    }
    this.setData({ submitting: true })
    try {
      const uploadedUrls = []
      for (const img of images) {
        const ext = img.split('.').pop()
        const cloudPath = `reports/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const res = await wx.cloud.uploadFile({ cloudPath, filePath: img })
        uploadedUrls.push(res.fileID)
      }
      const db = wx.cloud.database()
      await db.collection('reports').add({
        data: {
          platforms: selectedPlatforms,
          account_id: mainAccountId,
          issue_types: selectedIssues,
          other_issue: otherIssue,
          desc,
          contact,
          images: uploadedUrls,
          created_at: new Date().toISOString(),
          status: 'pending',
        }
      })
      wx.showModal({
        title: '提交成功',
        content: '感谢您的举报！我们会尽快核实处理。',
        showCancel: false,
        success: () => wx.navigateBack()
      })
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
