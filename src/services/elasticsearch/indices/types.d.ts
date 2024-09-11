import { IndicesCreateRequest } from "@elastic/elasticsearch/lib/api/types";

export interface Index {
  /**
    * The name of the index
    */
  name: string;
  /**
    * denotes whether the index is created or not
    */
  indexed: boolean;
  schema: () => Promise<IndicesCreateRequest>;
}
