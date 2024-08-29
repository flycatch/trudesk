const { Setting } = require("@/models");
const taskRunner = require("@/taskrunner");
const { AutotaggerJob } = require("@/taskrunner/autotagger-job");


/** 
 * @param {import('@/models/setting').Setting} event
 */
const onAutoTaggerEnable = async (event) => {
  const enabled = event?.value ?? await Setting.getSettingByName('autotagger:enable')
  if (enabled) {
    taskRunner.startCronJob(AutotaggerJob)
    return
  }
  taskRunner.stopCronJob(AutotaggerJob)
}

/**
 * @param {import('@/models/setting').Setting} data
 */
module.exports = async (data) => {
  if (data.name === 'autotagger:enable') {
    await onAutoTaggerEnable(data)
  }
}
