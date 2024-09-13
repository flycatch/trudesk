const { Setting } = require('@/models')

/** @type {import('./types').Index} */
const PublicQa = {}

PublicQa.name = "trudesk-public-qa"
PublicQa.indexed = false

PublicQa.schema = async function() {
  const settings = await Setting.getSettingsObjectByName(
    ['embeddings:dimension', 'embeddings:similarityFunction']
  )
  return {
    index: this.name,
    mappings: {
      properties: {
        type: { type: 'keyword' },
        source: { type: 'object' },
        vector: {
          type: 'dense_vector',
          dims: settings.embeddings_dimension,
          index: true,
          similarity: settings.embeddings_similarityFunction
        },
      }
    }
  }
}

module.exports = {
  PublicQa
}
