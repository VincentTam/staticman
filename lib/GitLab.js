'use strict'

const errorHandler = require('./ErrorHandler')
const GitLabApi = require('gitlab/dist/es5').default
const GitService = require('./GitService')

class GitLab extends GitService {
  constructor (options = {}) {
    super(options.username, options.repository, options.branch)

    this.repositoryId = `${this.username}/${this.repository}`

    if (options.oauthToken) {
      this.api = new GitLabApi({
        url: 'https://gitlab.com',
        oauthToken: options.token
      })
    } else {
      this.api = new GitLabApi({
        url: 'https://gitlab.com',
        oauthToken: options.oauthToken
      })
    }
  }

  _pullFile (path, branch) {
    return this.api.Projects.show(this.repositoryId, path, branch)
      .catch(err => Promise.reject(errorHandler('GITLAB_READING_FILE', {err})))
  }

  _commitFile (filePath, content, commitMessage, branch) {
    return this.api.Commits.create(this.repositoryId, branch, commitMessage, [
      {
        action: 'create',
        file_path: filePath,
        content,
        encoding: 'base64'
      }
    ])
  }

  getBranchHeadCommit (branch) {
    return this.api.Branches.show(this.repositoryId, branch)
      .then(res => res.commit.id)
  }

  createBranch (branch, sha) {
    return this.api.Branches.create(this.repositoryId, branch, sha)
  }

  createReview (reviewTitle, branch, reviewBody) {
    return this.api.MergeRequests.create(this.repositoryId, branch, this.branch, reviewTitle, {
      description: reviewBody,
      remove_source_branch: true
    })
  }

  readFile (filePath, getFullResponse) {
    return super.readFile(filePath, getFullResponse)
      .catch(err => Promise.reject(errorHandler('GITLAB_READING_FILE', {err})))
  }

  writeFile (filePath, data, targetBranch, commitTitle) {
    return super.writeFile(filePath, data, targetBranch, commitTitle)
      .catch(err => {
        if (err.error && err.error.message === 'A file with this name already exists') {
          return Promise.reject(errorHandler('GITLAB_FILE_ALREADY_EXISTS', {err}))
        }

        return Promise.reject(errorHandler('GITLAB_WRITING_FILE', {err}))
      })
  }

  writeFileAndSendReview (filePath, data, branch, commitTitle, reviewBody) {
    return super.writeFileAndSendReview(this, filePath, data, branch, commitTitle, reviewBody)
      .catch(err => Promise.reject(errorHandler('GITLAB_CREATING_PR', {err})))
  }
}

module.exports = GitLab