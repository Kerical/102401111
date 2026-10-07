# 校园失物招领：郑瀚的 AI 编程交接说明

适用对象：郑瀚（102401111）及协助开发的 AI。

本说明按 2026 年 10 月 7 日的代码状态编写。功能代码基线为 `45ae33ace688e478f96ca50fa6229b2d758ca7de`。文档中的“已有”指这份基线，“建议新增”指待实现内容。

## 1. 先拿到正确的代码

仓库地址：[illnessemc/102400412-102401111](https://github.com/illnessemc/102400412-102401111)。

**龚巍斌的功能代码和交接文档已推送到上游 `main`。** 队友可以直接从 GitHub 获取。按作业要求，郑瀚先在 GitHub fork 本仓库，再 clone 自己的 fork；如果之前已 fork，先同步上游最新基线。

新工作目录可按下面的流程准备，将“你的GitHub用户名”替换为郑瀚自己的账号：

```powershell
# 先在 GitHub 完成 fork，然后在自己的工作目录执行。
git clone "https://github.com/你的GitHub用户名/102400412-102401111.git" campus-lost-found
cd campus-lost-found
git remote add upstream https://github.com/illnessemc/102400412-102401111.git
git fetch upstream
git merge --ff-only upstream/main
git switch -c feat/publish-manage
```

已有工作目录时先检查 `git status`，保留未提交内容；已有 `upstream` 时无需重复添加。`origin` 应指向自己的 fork，`upstream` 指向龚巍斌的仓库。若 `--ff-only` 同步失败，先检查双方提交差异并协调，不重置或强制覆盖已有工作。

拿到代码后先检查：

```powershell
git status --short --branch
git show --no-patch --oneline 45ae33a
node --test tests/posts.test.cjs
```

应能找到 `45ae33a`，并有根目录的 `index.html`、`css/`、`js/`、`tests/` 和 `README.md`。基线已验证 32 个单元测试通过；在自己的机器上重新运行确认。运行网页只需 Chrome 打开 `index.html`；Node.js 只用于开发测试，本次基线使用 Node.js 24.16.0。

已有三个功能提交：

| 提交 | 内容 |
| --- | --- |
| `c3c5216` | `feat(home): implement local browsing and filters` |
| `b71b32d` | `feat(search): add keyword search and persistent filters` |
| `45ae33a` | `feat(detail): add item details and contact copying` |

## 2. 本次分工与完成标准

龚巍斌已完成：首页、类型/类别/地点筛选、关键词搜索、详情、查看和复制联系方式。搜索条件可在刷新和返回时恢复，已结束信息可通过搜索开关查看。

郑瀚负责接入以下四个页面和共用写入逻辑：

| 模块 | 必须达到的行为 |
| --- | --- |
| 发布信息 | 切换寻物/招领，填写并校验名称、类别、丢失/拾取时间、地点、描述和联系方式；真实保存到本地 |
| 发布成功 | 保存成功后才显示成功；展示刚发布的信息，支持返回首页和进入我的发布 |
| 我的发布 | 只展示当前本地身份发布的信息；显示总数、进行中、已结束数量，支持相应筛选和查看详情 |
| 状态更新 | 发布者将自己的寻物标为“已找到”，招领标为“已归还”；保存后其他页面立即反映结果 |

最终要走通两条流程：

- 发布寻物 → 首页/搜索找到 → 详情和联系方式 → 我的发布 → 已找到 → 首页不再展示，历史搜索保留结束状态。
- 发布招领 → 首页/搜索找到 → 详情和联系方式 → 我的发布 → 已归还 → 首页不再展示，历史搜索保留结束状态。

先完成核心流程、持久化和测试。原型中的“删除自己的发布”可作为后续补充，需有确认、取消和所有者校验。图片上传暂不列为核心要求；保留上传入口时不能让无效按钮看起来已经可用。

继续采用本地 Web：HTML、CSS、原生 JavaScript，同一个 `index.html`。暂不增加后端、登录系统、数据库服务、即时聊天、地图、信用分或虚假的浏览量。保留现有蓝绿配色、卡片布局和窄屏适配。

## 3. 现有代码与可复用接口

先阅读 `README.md`，再阅读下表文件。`html/overview.html` 以及 `html/publish.html`、`success.html`、`my.html`、`status.html` 是上次的原型参考，正式功能写在新入口中。

| 文件 | 已有职责 / 接入方式 |
| --- | --- |
| `index.html` | 已有首页、搜索、详情三个 `.page`；新增页面放在同一个 `main` 中 |
| `css/app.css` | 公用样式；优先复用 `.filter-button`、`.detail-card`、`.notice` 等，新增样式使用明确的模块类名 |
| `js/posts.js` | `CampusPosts`：共用字段、读取、查询、状态识别、时间展示；不负责写入 |
| `js/home.js` | `CampusHome.init()` / `render(posts, params)`；无需重写 |
| `js/search.js` | `CampusSearch.init()` / `render(posts, params)`；无需重写 |
| `js/detail.js` | `CampusDetail.render(posts, params, isDemo)`；返回路径需要小幅扩展，见第 5 节 |
| `js/app.js` | `renderRoute()`、导航、重新读取数据和公用 UI 函数；新增模块在这里接入 |
| `tests/posts.test.cjs` | 原有 32 个测试，必须继续通过，不通过时找原因，不删测试来掩盖问题 |

`CampusPosts` 已公开的关键接口：

| 接口 | 语义 |
| --- | --- |
| `STORAGE_KEY` | 信息存储键，值为 `campus-lost-found.posts.v1` |
| `loadPosts(storage)` | 返回 `{ posts, source, error }`；`source` 为 `local` 或 `demo` |
| `filterPosts(posts, options)` | 按条件查询并按发布时间降序排列；默认排除已结束信息，不修改输入数组 |
| `isFinished(post)` | “已找到”或“已归还”返回 `true` |
| `findPost(posts, id)` | 查找指定 ID，兼容数值/字符串 ID；不存在返回 `null` |
| `displayTime(value)` | 展示时间；带时区的时间转为北京时间 |

`filterPosts` 的条件为 `{ type, category, place, keyword, includeFinished }`。**我的发布的“全部”和“已结束”不能直接用默认查询**，应先按所有者筛选，并在需要历史数据时设置 `includeFinished: true`。

`CampusUI` 已公开 `element(tag, className, text)`、`navigate(route)`、`setCategories(select, posts, selected)`、`renderList(container, posts, from)` 和 `toast(message)`。其中 `element` 用 `textContent` 放入文本。发布者输入的名称、描述和联系方式继续按文本渲染，避免拼入未经处理的 HTML。

`renderList` 是浏览卡片，不含管理按钮。我的发布需要更新/删除按钮时，在自己的模块渲染管理卡片，避免改变首页和搜索卡片的结构。

## 4. 数据、所有者与保存约定

### 信息格式

存储值必须是 JSON 数组，不是 `{ posts: [...] }` 包装对象。新信息建议如下：

```json
{
  "id": "post-唯一标识",
  "type": "lost",
  "name": "黑色长柄雨伞",
  "category": "雨伞",
  "place": "图书馆一楼",
  "time": "2026-10-07T08:10",
  "createdAt": "2026-10-07T09:00:00+08:00",
  "status": "寻找中",
  "desc": "伞柄有银色金属环。",
  "contact": "微信：用于测试的示例账号",
  "ownerId": "当前本地身份的标识"
}
```

- `id` 是唯一的非空字符串或有限数值。生成新 ID 后仍要避免与已有记录冲突，不能用数组长度作为 ID。
- `name`、`category`、`place`、`time`、`desc`、`contact` 在发布时必填，文本去除首尾空格后不能为空；时间要有效。日期选择的是已经发生的丢失/拾取事件。
- `time` 与 `createdAt` 含义不同：前者是事件时间，后者是发布时间；更新状态时保留原发布时间。
- 读取端兼容缺少联系方式的旧记录，不代表发布端可以省略联系方式。
- 现有读取函数会保留 `ownerId` 等额外字段。修改某一条信息时保留其余字段和其余记录。

状态只能使用以下对应关系：

| `type` | 初始状态 | 结束状态 |
| --- | --- | --- |
| `lost` | `寻找中` | `已找到` |
| `found` | `招领中` | `已归还` |

不能增加“已解决”作为存储状态，不能把招领写成“已找到”。当前读取器会拒绝类型与状态不匹配的数组。

### 本地身份（待新增）

建议用另一个键 `campus-lost-found.user.v1` 保存一个稳定的本地身份 ID，**这个键和身份逻辑目前都未实现**。首次需要身份时生成并保存，以后复用，不要每次刷新换一个 ID；身份无法保存时也不能假装发布已成功。

新记录写入 `ownerId`。“我的发布”只显示 `post.ownerId === currentUserId` 的记录。当前示例记录和没有 `ownerId` 的旧记录默认不是本人的，不要自动接管。更新/删除函数本身也要校验所有者，不能只隐藏页面按钮。

这是同一浏览器内的身份区分，没有真实账户认证，也不提供不同电脑共享数据的能力。

### 读取与写入必须分清

`loadPosts` 的结果需要这样处理：

| 读取结果 | 写入前的处理 |
| --- | --- |
| `source === 'local'` 且 `error` 为空 | 基于读到的真实记录创建下一份数组 |
| `source === 'demo'` 且 `error` 为空 | 尚无真实记录；首次发布以空数组为基础，不能把示例信息当成真实发布一起保存 |
| `error` 非空 | 存储不可访问或数据损坏；停止这次写入并提示，保留原数据 |

首次真实发布后，首页由示例列表切换到真实列表，示例消失是预期行为。真实数组为 `[]` 时应继续显示空列表，不能重新填入示例。删除最后一条真实信息时也保存 `[]`，不要删掉信息存储键。不要调用 `localStorage.clear()`。

写入顺序：校验表单和身份 → 重新读取当前记录 → 检查目标/所有者 → 构造新数组 → `setItem` 成功 → 刷新页面/显示成功。写入失败时保留表单和旧数据，不清空表单，不更新成功统计，不跳转成功页。

写入后的现有通知接口是：

```javascript
window.dispatchEvent(new Event('campus:posts-changed'));
CampusUI.navigate('success?id=' + encodeURIComponent(String(newPost.id)));
```

这两行只能在真实保存成功之后执行，且需要先接入 `success` 路由。`campus:posts-changed` 会使当前页面重新读取数据；其他同入口窗口的更新由现有 `storage` 监听处理。

建议把校验、数组变更、存储写入放进少量可独立测试的函数，并允许传入模拟存储，不要将它们全部塞进按钮事件。直接打开文件时保持同一个 `index.html` 和浏览器配置测试；HTTP 预览与 `file://` 的存储不应当被当成同一份。

## 5. 页面与路由如何接入

下面是建议的新增组织，名称可调整，接口含义保持一致：

```text
js/manage.js          所有者、发布校验、写入和状态修改等业务函数
js/publish.js         发布页和发布成功页
js/my.js              我的发布页和状态更新页
tests/manage.test.cjs  新业务的自动化测试
```

沿用普通 `<script defer>`，业务函数先加载，页面模块再加载，`js/app.js` 最后加载。不要改成依赖构建的项目，也不要通过 `fetch` 从本地 JSON 文件加载数据。

| 建议路由 | 对应新增 section | 入口 |
| --- | --- | --- |
| `#publish?type=lost` | `page-publish` | 首页“我丢了东西” |
| `#publish?type=found` | `page-publish` | 首页“我捡到东西” |
| `#publish` | `page-publish` | 底部发布，默认寻物 |
| `#success?id=...` | `page-success` | 保存成功之后 |
| `#my?filter=all` | `page-my` | 底部我的 / 成功页 |
| `#my?filter=ongoing` / `finished` | `page-my` | 我的发布筛选 |
| `#status?id=...` | `page-status` | 本人的记录更新状态 |

必须完成的接线位置：

1. `index.html` 增加对应 `.page`、加载新脚本；使用明确且不重复的 ID。
2. 首页 `[data-publish-type]` 两个按钮解除 `disabled`，绑定相应路由，并去掉“暂未开放”文案。
3. 底部 `[data-page="publish"]` 和 `[data-page="my"]` 改为可用入口。现有导航高亮扫描的是 `a.nav-link`，使用与首页/搜索一致的链接形式。
4. `js/app.js` 的页面白名单目前只有 `home`、`search`、`detail`。增加新路由的白名单、渲染分支、模块初始化和文档标题，否则会被跳回首页。
5. `js/detail.js` 的 `backRoute(from)` 目前只允许返回 `home` / `search`。我的发布卡片进入详情时将 `from` 设置为原 `my?...` 条件，并给这个白名单添加 `my`，补测试；继续拒绝外部地址和不支持的页面。

状态页和成功页也要支持刷新或地址直接打开：通过 `id` 查当前记录，处理缺少 ID、记录被删除或不是本人等情况，不依赖某个上一次点击时留在内存中的对象。

“我的发布”的三个统计数应基于本人全部记录，切换筛选时统计口径不变。已结束记录保留查看详情入口。状态页只允许修改本人的有效记录；已结束记录不提供重复结束操作，不能误写另一种结束状态。“保持原状态”和取消均不改数据。

## 6. 建议分三步开发并提交

开发前先记录自己各步骤的 PSP 预估。以下只给任务顺序，耗时由本人估算和记录。

| 步骤 | 产出 | 建议 commit |
| --- | --- | --- |
| 1 | 发布校验、本地身份、可靠保存、发布页和成功页；验证两类发布 | `feat(publish): add persistent lost and found posting` |
| 2 | 我的发布、所有者筛选、统计、详情返回本人列表 | `feat(my): add owned posts and status filters` |
| 3 | 状态页、所有者与状态校验、联动更新、完整流程联调 | `feat(status): add owner-controlled status updates` |

测试、对应 README 说明和必要小修随功能提交。每步可运行且验证后再 commit，约 3 次即可；不要为每个文件拆提交，也不要最后人为制造结对历史。

开始前检查 `git status`，在拿到的基线上新建自己的功能分支。保留龚巍斌的提交和原型历史，不重建 `.git`，不 reset/clean，不夹带别人的未提交文档。不冒用队友的作者身份。

龚巍斌部分现已发布到上游 `main`。郑瀚的 AI 开发默认先完成本地实现、测试和 commit；获得郑瀚明确授权后，向自己的 fork 推送功能分支并向上游发起 PR。不要直接推送上游 `main`，也不要自动合并 PR。交付 PR 前确认基于最新上游，PR 差异应主要是郑瀚自己的发布与管理功能。

## 7. 测试与交付验收

新业务至少补 10 个有实际断言的用例，按白盒分支设计，优先覆盖：

| 范围 | 新增测试应覆盖的情况 |
| --- | --- |
| 发布 | 寻物成功、招领成功、缺必填项、纯空格、无效时间、重复 ID |
| 存储 | 首次发布不保存示例；已有记录被保留；保存失败不成功；损坏 JSON 不被覆盖 |
| 我的发布 | 只显示本人；无所有者/其他人的记录被排除；统计与筛选正确 |
| 状态 | 寻物→已找到、招领→已归还；非本人、未知 ID、错误状态被拒绝；重复操作不产生新记录 |

使用 `node:test` 和 `node:assert/strict`，参考现有测试的固定数据和模拟存储。测试不修改真实浏览器数据。先运行原有测试，新测试接入后运行全部测试：

```powershell
node --test
```

然后在 **Google Chrome 普通窗口直接打开 `index.html`**，用自己创建的测试记录走查：

- [ ] 两个首页快捷入口分别预选正确的发布类型，时间/地点字段名称随类型变化。
- [ ] 不完整信息不能发布；成功页显示刚发布的正确记录。
- [ ] 新信息出现在首页、关键词搜索和我的发布；其他原有真实记录保留。
- [ ] 刷新/关闭再打开后，记录与本人身份保持一致。
- [ ] 我的发布进入详情，再返回时保留本人列表的筛选条件。
- [ ] 本人更新两类状态后，首页有效列表移除，历史搜索和详情显示正确状态，本人统计同步。
- [ ] 不是本人或不存在的记录不能被修改；缺参数/失效地址不导致页面崩溃。
- [ ] 原有搜索、联系方式查看/复制和返回条件没有被破坏。
- [ ] 桌面与窄屏无横向溢出，底部导航和表单按钮可用。

交付时提供提交列表、改动文件和运行方法、新测试结果、完整流程截图，以及真实遇到的问题和解决办法；经本人授权发布 PR 后一并提供 PR 地址。更新 README 的完成状态、目录与使用说明。保留原有原型和资料。

博客还需要 PSP 实际记录、实现流程图、关键代码解释、特色展示、测试工具教程、commit 截图和队友评价；这些内容据实际开发填写，不虚构反馈或耗时。正常作业截止为 **2026 年 10 月 10 日 23:59（北京时间）**，两人的博客、结对表和项目地址也需及时完成。

## 8. 可直接复制给 AI 的开工提示词

下面由郑瀚拿到完整基线代码后复制给自己的 AI，并让它读取本说明：

```text
我是郑瀚（102401111），负责校园失物招领项目的发布、发布成功、我的发布和状态更新。

请先阅读《队友AI编程交接说明.md》、README.md、index.html、js/posts.js、js/app.js、js/detail.js 和现有测试，并参考 html/ 中的上次原型。龚巍斌部分已经推送到上游 main，请从我的 fork 同步最新上游，确认本地代码包含 45ae33a，并在功能分支开发；如果缺少基线，先检查同步状态，不要重做龚巍斌的部分。

请沿用 HTML/CSS/原生 JavaScript 和同一个 index.html，完成我的四个模块及必要的持久化/本地身份逻辑。按交接说明的 JSON 数组、存储键、ownerId、类型状态和通知事件接入，处理读写失败与缺参数，保留首页、搜索、详情及其既有行为。特别注意 app.js 的路由白名单、my 进入详情后的返回路径、首次真实发布不把演示数据保存、保存失败不能显示成功。

开始前给出简短计划并记录 PSP 预估，分发布、我的发布、状态更新三步实现。每步完成后验证，并采用 type(scope): description 规范进行本地 commit，约 3 次。保留已有提交与未提交内容，不删改上次原型，不 reset/clean，不冒用队友身份。获得我的明确授权后才向自己的 fork 推送功能分支并创建 PR，不直接推送上游 main，不自动合并 PR。

原有 32 个测试必须继续通过，为新业务补充至少 10 个有实际价值的白盒用例，使用现有 Node 内置测试工具。最终在 Chrome 直接打开 HTML 走通两类发布到结束状态的流程，检查刷新持久化、所有者限制、搜索联动和窄屏布局。更新 README，给出实际测试结果、提交列表和剩余限制；无法验证的项目明确说明。核心功能完成前不要扩展后端、聊天、地图、信用分等功能。
```
