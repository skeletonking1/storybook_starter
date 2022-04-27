# Build Storybook and Publish to AWS S3 bucket using Github actions

This is an example of how to build storybook and publish to aws s3 bucket by using CI/CD.

## About workflows

A workflow is a configurable automated process that will run one or more jobs. Workflows are defined by a YAML file checked in to your repository and will run when triggered by an event in your repository, or they can be triggered manually, or at a defined schedule.

Workflows are defined in the .github/workflows directory in a repository, and a repository can have multiple workflows, each of which can perform a different set of tasks. For example, you can have one workflow to build and test pull requests, another workflow to deploy your application every time a release is created, and still another workflow that adds a label every time someone opens a new issue.

## Create an workflow
GitHub Actions uses YAML syntax to define the workflow. Each workflow is stored as a separate YAML file in your code repository, in a directory named .github/workflows.
In your repository, create the .github/workflows/ directory to store  workflow files.
ex: workflows/chromatic.yml
## configure workflow for deploying and publishing storybook to aws s3 bucket
Here is chromatic.yml configue.


    jobs:
      # This workflow contains a single job called "build"
      build:
        # The type of runner that the job will run on
        runs-on: ubuntu-latest

        # Steps represent a sequence of tasks that will be executed as part of the job
        steps:
          # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
          - uses: actions/checkout@v3
          - name: Configure AWS Credentials
            uses: aws-actions/configure-aws-credentials@v1
            with:
              role-to-assume: arn:aws:iam::7***********:role/my-github-actions-role
              aws-region: us-east-1
          - name: Install dependencies
            run: yarn install
          # build and hash folder, deploy storybook
          - name: build storybook and publish to S3 bucket
            run: yarn run deploy-storybook
## configure package.json file
- `yarn run build storybook`: Run building all story book components
- `yarn run deploy-storybook`: Run deploy command
## Deploy command

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
  hashPromise function returns hash string of buket name and hashAndDeploy function runs deploy commands.

## AWS IAM roles policy
According to [Security best practices in IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) , applications and services should use IAM roles instead of IAM users. Fortunately it is possible to configure it for GitHub actions using OIDC.
IAM OIDC identity providers are entities in IAM that describe an external identity provider (IdP) service that supports the OpenID Connect (OIDC) standard. You use an IAM OIDC identity provider when you want to establish trust between an OIDC-compatible IdP (GitHub in our case) and your AWS account. 
- `Create a new Identity provider`
For the provider URL: Use https://token.actions.githubusercontent.com 
- `Create an IAM role and select the Identity provider created earlier`
Once the role has been created, you need to modify Trust policy

      {
      "Version": "2012-10-17",
      "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::7***********:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:storybook-starter/*:*"
                }
            }
        }
      ]
      }
Once the IAM Role is ready, you can use it in GutHub Actions manifest. The job or workflow run requires a permissions setting with id-token: write. You won't be able to request the OIDC JWT ID token if the permissions setting for id-token is set to read or none. The aws-actions/configure-aws-credentials action receives a JWT from the GitHub OIDC provider, and then requests an access token from AWS.
