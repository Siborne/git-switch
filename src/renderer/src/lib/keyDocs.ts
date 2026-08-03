/**
 * 常用 git 配置项含义解释（key → 中文说明）
 * 用于表格/标签悬停提示。
 */
export const KEY_DOCS: Record<string, string> = {
  // 身份
  'user.name': '提交者姓名（commit author 显示名）',
  'user.email': '提交者邮箱（commit author 邮箱）',
  'user.signingkey': 'GPG 签名密钥指纹',
  // 提交签名
  'commit.gpgsign': '是否对提交进行 GPG 签名（true/false）',
  'commit.gpgsigndefault': '是否对未显式指定 -s 的提交也签名',
  'gpg.format': 'GPG 格式（openpgp / ssh / x509）',
  'gpg.program': 'GPG 可执行程序路径',
  // 行为
  'core.autocrlf': '换行符自动转换（true / input / false；Windows 建议 true）',
  'core.eol': '工作区换行符（lf / crlf）',
  'core.editor': '默认编辑器命令',
  'core.filemode': '是否跟踪文件可执行位（Windows 建议 false）',
  'core.ignorecase': '是否忽略文件名大小写',
  'core.symlinks': '是否启用符号链接',
  'core.fscache': 'Windows 文件系统缓存（性能优化）',
  'core.quotepath': '非 ASCII 路径是否转义显示',
  'core.safecrlf': '换行符转换校验（warn / true / false）',
  'init.defaultBranch': 'git init 默认分支名',
  'pull.rebase': 'git pull 使用 rebase 而非 merge（false / true / merges / interactive）',
  'fetch.prune': 'git fetch 时自动清理已删除的远端分支',
  'rebase.autoStash': 'rebase 前自动 stash 工作区改动',
  'merge.conflictstyle': '冲突标记样式（merge / diff3）',
  'diff.algorithm': 'diff 算法（myers / minimal / patience / histogram）',
  'color.ui': '终端颜色输出（auto / always / false）',
  // 网络
  'http.proxy': 'HTTP 代理地址（http://user:pass@host:port）',
  'https.proxy': 'HTTPS 代理地址',
  'http.sslVerify': '是否校验 HTTPS 证书',
  'http.sslBackend': 'SSL 后端（openssl / schannel）',
  'http.sslcainfo': 'CA 证书包路径',
  'url.<base>.insteadOf': 'URL 重写规则（如 git@github.com 替换 https://github.com）',
  // 凭据
  'credential.helper': '凭据存储方式（manager / store / cache）',
  'credential.username': '默认凭据用户名',
  'credential.useHttpPath': '是否按 URL 路径区分凭据',
  'safe.directory': '信任的仓库目录（规避所有权检测）',
  // 仓库内部
  'core.repositoryformatversion': '仓库格式版本（勿手动修改）',
  'core.bare': '是否为裸仓库',
  'core.logallrefupdates': '是否记录 ref 更新日志',
  'core.worktree': '工作树路径',
  'remote.origin.url': '远端 origin 地址',
  'remote.origin.fetch': '远端抓取 refspec',
  'branch.master.remote': 'master 分支关联的远端',
  'branch.master.merge': 'master 分支合并的 ref',
  // LFS
  'filter.lfs.clean': 'Git LFS clean 过滤器',
  'filter.lfs.smudge': 'Git LFS smudge 过滤器',
  'filter.lfs.process': 'Git LFS 进程过滤器',
  'filter.lfs.required': 'Git LFS 必需标记',
  // 其他
  'diff.astextplain.textconv': '文本转换工具（astextplain）',
  'credential.https://dev.azure.com.usehttppath': 'Azure DevOps 凭据按路径区分'
}

/** 获取配置项含义；未知 key 返回 undefined */
export function describeKey(key: string): string | undefined {
  return KEY_DOCS[key]
}
