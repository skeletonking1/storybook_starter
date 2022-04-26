const { hashElement } = require('folder-hash');

hashAndDeploy()

async function hashAndDeploy(){
  await runCommand("npm run build");
  const folderHash = await hashPromise();
  await runCommand(`storybook-to-aws-s3 --ci --bucket-path=storybook-elysium/${folderHash}`)
  await runCommand(`gh-pr-comment "Storybook Deployment" "https://s3-url-for-the-deploy/${folderHash}"`)
}

async function hashPromise(){
  const options = { folders: { include: ['storybook-static'] } };
  return new Promise((res,rej)=>{
    hashElement('.', options)
    .then(hash => {
      const bucketName = hash.toString()
      res(bucketName);
    })
    .catch(error => {
      rej(error)
    });
  })
}
 
async function runCommand(command) {

  return new Promise((res, rej) => {
    const spawn = require('child_process').spawn;
    const ls = spawn(command, {
      shell: true,
    });

    ls.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    ls.stderr.on("data", (data) => {
      console.log(`stderr: ${data}`);
    });

    ls.on("error", (error) => {
      console.log(`error: ${error.message}`);
      rej(error);
    });

    ls.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      if (code === 0) {
        res(code);
      } else {
        rej(code);
      }
    });
  });
}