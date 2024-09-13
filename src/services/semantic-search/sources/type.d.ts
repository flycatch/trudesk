import { Search } from '@/services/semantic-search';

export interface Source {

  /**
   * A function that the Search init calls to register sources.
   * This function is called only once and acts as a initializer of the source.
   * During this phase the source can register listeners that listens on events,
   * topics, that will feed data to the index
   */
  registerSource(search: typeof Search): Promise<void>;


  /**
   * A function that syncs the source to elastic index.
   * This fucntion will be called when ES indexes are being rebuild.
   */
  syncSource(search: typeof Search): Promise<void>
}
