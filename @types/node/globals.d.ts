import { ChildProcess } from "child_process";

declare global {
    var forks: Array<{ name: string, fork: ChildProcess }>;

    var env: string;
    var CONNECTION_URI: string;

    var esStatus: string;
    var esRebuilding: boolean;

    namespace Express {
        export interface Request {

            /** Stores info related to verification session */
            verified?: {
                enabled: boolean;
                verified: boolean;
                email?: string | undefined
            }
        }
    }
}
