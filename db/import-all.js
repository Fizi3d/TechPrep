import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

async function runSeed() {
  try {
    console.log("Running database imports...\n");

    console.log("Importing questions...\n");
    await execPromise("node db/import-questions.js\n");

    console.log("Importing technical questions...\n");
    await execPromise("node db/import-technical-b.js");

    console.log("Importing behavioral questions...\n");
    await execPromise("node db/import-behavioral-b.js");

    console.log("Imports complete!");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

runSeed();