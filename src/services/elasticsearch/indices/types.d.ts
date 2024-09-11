import { IndicesCreateRequest } from "@elastic/elasticsearch/lib/api/types";

export interface Index {
    name: string;
    schema: () => Promise<IndicesCreateRequest>;
}
