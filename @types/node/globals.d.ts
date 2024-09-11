import { ChildProcess } from "child_process";

declare global {
    var forks: Array<{ name: string, fork: ChildProcess }>;

    var env: string;
    var CONNECTION_URI: string;

    var esStatus: string;
    var esRebuilding: boolean;
}
