const { Setting } = require("@/models");
const { AUTOTAGGER_ENABLE } = require("@/settings/settings-keys");
const taskRunner = require("@/taskrunner");
const { AutotaggerJob } = require("@/taskrunner/autotagger-job");


/** 
 * @param {import('@/models/setting').Setting} event
 */
const onAutoTaggerEnable = async (event) => {
  const enabled = event?.value ?? await Setting.getSettingByName(AUTOTAGGER_ENABLE)
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
  if (data.name === AUTOTAGGER_ENABLE) {
    await onAutoTaggerEnable(data)
  }
}
