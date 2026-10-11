/* ============================================================
   《错位夜宵》剧本文档（剧本数据层）
   步骤类型：
     card      章节卡   { card, sub, hold }
     bg        背景     { bg, pos, dur, pan, blur }
     cg        CG 特写  { cg, mode:'inset'|'full', dur, pos }
     cgOff     关闭 CG
     char      立绘     { char, pos, dur } / { char: null }
     flash     闪光     { flash:'white'|'black', dur }
     shake     震屏     { shake: 强度, dur }
     fx        特效     { fx: 'glitch' | 'glow' | 'glowOff' | 'flashbackOn' | 'flashbackOff' }
     text      台词     { text, who, kind:'inner'|'say'|'action'|'narration'|'memory'|'inner-strong' }
     wait      自动等待 { wait }
     end       章节结束 { end:{ title, sub } }
   ============================================================ */
(function (global) {
  'use strict';
  var GAL = global.GAL || (global.GAL = {});

  var S = 'assets/scene/';

  /* 选项交互开关：
     choiceConfirm: false → 点一次就选（默认）
                    true  → 点两次确认（防误触，选项很大时更稳） */
  GAL.Config = GAL.Config || {};
  GAL.Config.choiceConfirm = false;

  GAL.Chapters = {

    /* ---------------- 第一章 · 醒在别人的身体里 ---------------- */
    'ch1': {
      id: 'ch1',
      title: '第一章 · 醒在别人的身体里',
      place: '大学校园 · 林荫道旁的长椅',
      steps: [
        /* --- 前情一笔带过：通关 → 拼好饭 → 中毒 → 穿越（用实拍的深夜房间当底） --- */
        { place: '现实 · 深夜的出租屋' },
        { bg: S + 'bg-room-night.webp', pos: '50% 42%', dur: 1600 },
        { text: '熬夜通关了那款 galgame——余额 11.30 元，点了份 9.9 元的拼好饭炸鸡。第一口咬下去，刺耳的耳鸣，眼前一黑。', who: '前情提要', kind: 'memory' },
        { flash: 'white', dur: 420 },
        { fx: 'flashbackOff' },

        { card: '第一章', sub: '醒在别人的身体里', hold: 2000 },
        { place: '大学校园 · 林荫道旁的长椅' },
        { bg: S + 'bg-bench-close.webp', pos: '50% 62%', dur: 1500 },

        { text: '我去……，给我干哪来了……', who: '主角', kind: 'inner' },
        { text: '一只手抬起来，死死按住太阳穴，眉头紧锁。', kind: 'action' },
        { text: '头好疼……', who: '主角', kind: 'say' },
        { cg: S + 'cg-wake-head.webp', mode: 'inset', dur: 600 },
        { text: '手撑着额头。指腹底下是自己的皮肤——温的。', kind: 'narration' },
        { cgOff: true },

        { place: '林荫步道 · 通向图书馆的路口' },
        { bg: S + 'bg-path.webp', pos: '50% 55%', dur: 1400, pan: 'left' },
        { text: '缓缓抬起头，眼神恍惚，茫然地向四周来回观望。', kind: 'action' },
        { text: '镜头缓缓扫过林荫步道——不远处是通向图书馆的路口，隔着树丛隐约露出一角雷锋雕像。路上零星有下课走动的学生。', kind: 'narration' },

        { bg: S + 'bg-bench-close.webp', pos: '50% 58%', dur: 700, shake: 13 },
        { text: '刚刚扫视完周围，一阵强烈的眩晕再度袭来。', kind: 'narration' },
        { text: '主角的身子轻轻一晃，后背重重靠住长椅靠背。', kind: 'action' },

        { fx: 'glitch', dur: 900 },
        { text: '不会吧……难道我穿越到刚刚打完的那款游戏里面了！？', who: '主角', kind: 'inner-strong' },
        { text: '又头晕……', who: '主角', kind: 'inner' },

        { cg: S + 'cg-bench-phone.webp', mode: 'inset', dur: 700 },
        { text: '慌忙伸手摸进口袋，掏出裤兜里的智能手机。拇指划开锁屏。', kind: 'action' },
        { cg: S + 'cg-phone-time.webp', mode: 'inset', dur: 450 },
        { text: '【屏幕特写】白天的日期与时间——已经不再是现实里的深夜两点多。', kind: 'narration' },

        { cgOff: true },
        { flash: 'white', dur: 380 },
        { text: '盯着屏幕上的时间，现实的记忆瞬间翻涌冲进脑海——', who: '主角', kind: 'inner' },

        { place: '回忆 · 现实世界的出租屋' },
        { fx: 'flashbackOn' },
        { text: '深夜的出租屋，显示器幽幽的白光，通关字幕还在缓缓滚动。', kind: 'memory' },
        { text: '熬夜打通的那款 galgame。手机余额：11.30 元。', kind: 'memory' },
        { text: '那份 9.9 元的错位拼好饭炸鸡——咬下第一口之后，是刺耳的耳鸣，然后重重摔倒在地。', kind: 'memory' },
        { fx: 'flashbackOff' },

        { flash: 'white', dur: 320 },
        { text: '紧接着，属于这具原生身体的记忆也开始涌入——本校的学生、课程、日常的校园生活。', kind: 'narration' },

        { fx: 'glow' },
        { text: '就在这时，一股无形的力量自心底扩散开来。', kind: 'narration' },

        /* ================= 真穿越 · 姓名与好感浮现 ================= */
        { place: '大学校园 · 林荫道旁的长椅' },
        { text: '不是做梦。', who: '主角', kind: 'inner' },
        { text: '手机在手里是热的。风是凉的。远处有人在笑。', kind: 'narration' },
        { text: '我真的……进来了。', who: '主角', kind: 'inner-strong' },
        { text: '穿进了那款我通宵打通、看完了所有人结局的 galgame 里。', who: '主角', kind: 'inner' },
        { fx: 'glitch', dur: 700 },
        { text: '眼前忽然亮起一行字。', kind: 'narration' },

        { ui: { type: 'who', name: '小郑', aff: 40, label: '普通朋友', rel: '同班同学 · 游戏搭子', note: '线下能正常搭话，但并不亲密', img: 'assets/chars/tong-card.webp' } },
        { affinity: { who: '小郑', value: 40, label: '普通朋友', hold: 4200 } },
        { text: '小郑。', who: '主角', kind: 'inner-strong' },
        { text: '同班同学，一起打游戏的搭子。平时在群里喊我上号的那个。', who: '主角', kind: 'inner' },
        { text: '好感 40。', who: '主角', kind: 'inner' },

        { ui: { type: 'who', name: '阿松', aff: 15, label: '网友', rel: '同校 · 匿名网友 · 线下从未见面', note: '几天才聊几句，大多是互相问问题', img: 'assets/chars/song-card.webp' } },
        { affinity: { who: '阿松', value: 15, label: '网友', hold: 4200 } },
        { text: '阿松。', who: '主角', kind: 'inner-strong' },
        { text: '同校，但现实里从来没见过。只在匿名论坛上聊过。', who: '主角', kind: 'inner' },
        { text: '……我对他几乎一无所知。连他长什么样都不知道。', who: '主角', kind: 'inner' },

        { ui: { type: 'who', name: '小帅', aff: 0, label: '未认识', rel: '尚未相识', note: '——', img: 'assets/chars/shuai-card.webp' } },
        { affinity: { who: '小帅', value: 0, label: '未认识', hold: 4200 } },
        { text: '小帅。', who: '主角', kind: 'inner-strong' },
        { text: '零。', who: '主角', kind: 'inner' },
        { text: '这个名字我见过——在那款游戏的攻略里。', who: '主角', kind: 'inner' },
        { text: '但在这个世界里，我们还没见过面。', who: '主角', kind: 'inner' },

        { ui: 'off' },
        { text: '三个人，三个数字。', who: '主角', kind: 'inner' },
        { text: '像一张还没填完的表。', kind: 'narration' },
        { text: '——难道说，要把这三个人都攻略完，我才能回去？！', who: '主角', kind: 'inner-strong' },
        { fx: 'glow' },

        { ui: { type: 'cast', title: '当前关系一览', rows: [
            { name: '小郑', aff: 40, label: '普通朋友', rel: '同班同学 · 游戏搭子', img: 'assets/chars/tong-card.webp' },
            { name: '阿松', aff: 15, label: '网友', rel: '同校 · 匿名网友 · 线下从未见面', img: 'assets/chars/song-card.webp' },
            { name: '小帅', aff: 0, label: '未认识', rel: '尚未相识', img: 'assets/chars/shuai-card.webp' }
        ] } },
        { text: '一张面板在眼前展开，把三个人的信息排得整整齐齐。', kind: 'narration' },
        { text: '姓名。关系。好感。', who: '主角', kind: 'inner' },
        { text: '像游戏里的任务列表。', who: '主角', kind: 'inner' },
        { text: '——可我连这是哪一款游戏、该怎么玩，都还没搞明白。', who: '主角', kind: 'inner-strong' },
        { ui: 'off' },

        { text: '风又吹过来一次。远处有人在喊谁的名字。', kind: 'narration' },
        { text: '我把这具身体的手举起来，看了很久。', kind: 'narration' },
        { text: '这不是我的手。但它在抖的时候，我知道是我在抖。', who: '主角', kind: 'inner' },

        /* ================= 手机响了 · 小郑的邀请 ================= */
        { text: '我得先把当下的信息整理一遍。', who: '主角', kind: 'say' },
        { text: '（手机在口袋里震了一下。）', kind: 'action' },
        { fx: 'glow' },
        {
          ui: {
            type: 'chat', title: '小郑',
            msgs: [
              { who: '小郑', text: '下午没课' },
              { who: '小郑', text: '要不要来玩 pubg？' }
            ]
          }
        },
        { text: '是小郑发来的。', who: '主角', kind: 'inner' },
        {
          choice: {
            prompt: '怎么回',
            options: [
              { text: '「等会回去玩」', goto: 'd_play_go', flag: 'd_play', aff: { tong: 1 }, notice: '好感度 +1' },
              { text: '「临时有事，先不玩」', goto: 'd_busy_go', flag: 'd_busy', notice: '好感度无变化' }
            ]
          }
        },

        /* ---------------- 分支 1：答应去玩 ---------------- */
        { label: 'd_play_go' },
        { ui: 'off' },
        { text: '先发展小郑这条线吧。', who: '主角', kind: 'inner' },
        { text: '他点开通讯录，往上滑。', kind: 'narration' },
        {
          ui: {
            type: 'chat', title: '匿名账号 · 阿松',
            msgs: [
              { who: '松饼上的灰', text: '（几天前）这个报错你那边遇到过吗' },
              { me: true, text: '遇到过。清一下缓存再跑。' },
              { who: '松饼上的灰', text: '好了，谢了。' }
            ]
          }
        },
        { text: '对话框停在几天前。只有简短的互相请教，没有多余情绪，也没有生活琐事。', kind: 'narration' },
        { text: '没有新消息。', kind: 'narration' },
        { text: '他简单扫了一眼聊天记录，没有发消息。', kind: 'narration' },
        { ui: 'off' },
        { text: '至于小帅——通讯录里根本没有这个人。', kind: 'narration' },
        { text: '两个人还处在完全互不相识的状态。', kind: 'narration' },
        { text: '主角没有继续盯着手机。他把手机收起来，弯腰捡起刚刚落在长椅旁的那片樟树叶。', kind: 'narration' },
        { text: '拿在手里，翻来覆去地端详。', kind: 'narration' },
        { text: '三个目标，好感数值就摆在那里。', who: '主角', kind: 'inner' },
        { text: '但这个世界是真实的。不是我之前反复读档的那款游戏。', who: '主角', kind: 'inner-strong' },
        { text: '不能像玩游戏那样粗暴地推进剧情。', who: '主角', kind: 'inner' },
        { text: '我要先摸清这个世界的细节，搞清楚回家的条件到底是不是攻略他们。', who: '主角', kind: 'inner-strong' },
        { goto: 'walk' },

        /* ---------------- 分支 2：先不玩 ---------------- */
        { label: 'd_busy_go' },
        { ui: 'off' },
        { text: '他把回复发了出去。', kind: 'narration' },
        { text: '然后关掉聊天窗口，依旧点开了和阿松的对话框。', kind: 'narration' },
        {
          ui: {
            type: 'chat', title: '匿名账号 · 阿松',
            msgs: [
              { who: '松饼上的灰', text: '（几天前）这个报错你那边遇到过吗' },
              { me: true, text: '遇到过。清一下缓存再跑。' },
              { who: '松饼上的灰', text: '好了，谢了。' }
            ]
          }
        },
        { text: '对话框停在几天前。只有简短的互相请教，没有多余情绪，也没有生活琐事。', kind: 'narration' },
        { text: '没有新消息。他扫了一眼，没有发消息。', kind: 'narration' },
        { ui: 'off' },
        { text: '至于小帅——通讯录里根本没有这个人。', kind: 'narration' },
        { text: '两个人还处在完全互不相识的状态。', kind: 'narration' },
        { text: '拒绝游戏邀约，可以留出空闲时间，让我先好好了解一下现状。', who: '主角', kind: 'inner' },
        { text: '三个目标，好感数值就摆在那里。', who: '主角', kind: 'inner' },
        { text: '但这个世界是真实的。不是我之前反复读档的那款游戏。', who: '主角', kind: 'inner-strong' },
        { text: '不能像玩游戏那样粗暴地推进剧情。', who: '主角', kind: 'inner' },
        { text: '我要先摸清这个世界的细节，搞清楚回家的条件到底是不是攻略他们。', who: '主角', kind: 'inner-strong' },
        { goto: 'walk' },

        /* ================= 校园闲逛 · 认地点 ================= */
        { label: 'walk' },
        { place: '林间小路' },
        { bg: 'assets/scene/bg-trail1.webp', pos: '50% 50%', dur: 1300 },
        { text: '他沿着林间小路慢慢走，脚步放得很慢。', kind: 'narration' },
        { text: '目光扫过沿途景物，在脑海里和原作游戏的场景一一对照辨认。', kind: 'narration' },

        { place: '观众台' },
        { bg: 'assets/scene/bg-bleachers.webp', pos: '50% 50%', dur: 1200 },
        { text: '路过观众台——', kind: 'narration' },
        { text: '原作里，小郑曾在这里独自坐着，袒露过「害怕被束缚」的心事。', kind: 'narration' },

        { place: '计算中心' },
        { bg: 'assets/scene/bg-cc-front.webp', pos: '50% 50%', dur: 1200 },
        { text: '走过计算中心——', kind: 'narration' },
        { text: '阿松曾深夜在这里短暂停留，偷偷存放他收藏的旧物件。', kind: 'narration' },

        { place: '湖边小椅' },
        { bg: 'assets/scene/bg-lake.webp', pos: '50% 50%', dur: 1200 },
        { text: '经过湖边的小椅——', kind: 'narration' },
        { text: '那是小帅经常一个人坐着发呆、沉浸在自己爱好里的地方。', kind: 'narration' },

        { place: '校园 · 绕行一圈' },
        { bg: 'assets/scene/bg-road1.webp', pos: '50% 50%', dur: 1200 },
        { text: '一路上只遇见往来的普通学生，没有撞见那三个人。', kind: 'narration' },
        { text: '主角远远打量着这些地点，默默记在心里。', kind: 'narration' },
        { text: '游戏里只是一张背景贴图的场景——此刻的触感、气味、风声，全都无比真实。', kind: 'narration' },
        { text: '绕完校园一圈，午后的阳光微微倾斜。', kind: 'narration' },
        { text: '大体的地图和关键点位都确认完了。', who: '主角', kind: 'inner' },
        { text: '光靠认路还不够。我需要收集更多原作之外、这个真实世界独有的信息。', who: '主角', kind: 'inner-strong' },
        { text: '他停下脚步想了想，打算先回宿舍。', kind: 'narration' },
        { if: 'd_play', goto: 'home_play' },
        { goto: 'home_busy' },

        /* ---------------- 分支 1 后续：和小郑玩到傍晚 → 查论坛 ---------------- */
        { label: 'home_play' },
        { place: '学生宿舍 · 傍晚' },
        { bg: 'assets/scene/bg-dorm-night.webp', pos: '50% 45%', dur: 1400 },
        { text: '回到宿舍，跟小郑联机，一直打到傍晚。', kind: 'narration' },
        { text: '游戏里照旧是他带我。中途他只说了两个字。', kind: 'narration' },
        { text: 'MJ。', who: '小郑', kind: 'say' },
        { text: 'MJ。', who: '主角', kind: 'say' },
        { text: '……他笑了一声。下线前又发了一句「明天继续」。', kind: 'narration' },
        { text: '简单道别，下线。', kind: 'narration' },
        { text: '主角没有休息，打开了校园匿名论坛。', kind: 'narration' },
        { text: '宿舍里只有台灯亮着。窗外路灯的微光透过纱窗漫进来。', kind: 'narration' },
        {
          ui: {
            type: 'note', title: '校园匿名论坛 · 搜索',
            lines: ['关键词：「旧物」「藏品」「老物件」', '（没有搜名字 —— 阿松本身就是匿名网友）']
          }
        },
        { text: '他没有直接搜名字，而是检索相关的爱好标签、之前聊天里提到过的冷门领域。', kind: 'narration' },
        { ui: 'off' },
        { text: '翻了很多页帖子。大多是无关的校园琐事、社团招募、吐槽贴。', kind: 'narration' },
        {
          ui: {
            type: 'post', title: '冷门收藏讨论帖 · 评论区',
            user: '匿名用户（灰色默认头像）', time: '三天前',
            text: '「那个卡扣是塑料的，用力会断。建议从侧面撬。」'
          }
        },
        { text: '慢慢往下滑，终于看见几条零星、隐晦的留言。', kind: 'narration' },
        { text: '口吻和线上那个人的风格高度相似：文字克制，话不多，只在别人提问时给出简洁的解答。', kind: 'narration' },
        { text: '几乎从不主动分享自己的生活。没有照片，没有个人信息，连头像都是系统默认的灰色图标。', kind: 'narration' },
        { ui: 'off' },
        { text: '果然，他习惯藏在暗处。', who: '主角', kind: 'inner' },
        { text: '论坛上没人知道他是谁——就像我和他的聊天记录，永远只有问答，没有私事。', who: '主角', kind: 'inner' },
        { text: '原作只写了他喜欢收藏旧物、害怕线下见面。', who: '主角', kind: 'inner' },
        { text: '但没有写他在校园论坛里，一直在这个圈子默默回复别人。', who: '主角', kind: 'inner-strong' },
        { text: '继续往下翻，找不到更多内容。', kind: 'narration' },
        { text: '所有线索都很零碎，只能确认一件事：阿松会在这个板块潜水，很少露面。', kind: 'narration' },
        { text: '他关掉帖子页面，靠在椅背上。', kind: 'narration' },
        { text: '资料太少。现在能掌握的信息依旧有限。', who: '主角', kind: 'inner' },
        { text: '今晚暂时到此为止。明天再想办法——顺着之前请教问题的聊天模式，找一个合适的理由给他发消息。', who: '主角', kind: 'inner-strong' },
        { end: { title: '第一章 · 完', sub: '下一段：第二天', next: 'ch2' } },

        /* ---------------- 分支 2 后续：直接查论坛 ---------------- */
        { label: 'home_busy' },
        { place: '学生宿舍 · 午后' },
        { bg: 'assets/scene/bg-dorm-dusk.webp', pos: '50% 45%', dur: 1400 },
        { text: '回到宿舍，主角直接打开电脑，进了校园匿名论坛。', kind: 'narration' },
        { text: '房间安安静静，只有电脑风扇微弱的嗡鸣。', kind: 'narration' },
        {
          ui: {
            type: 'note', title: '校园匿名论坛 · 搜索',
            lines: ['避开昵称', '用记忆里的爱好关键词，一页页翻']
          }
        },
        { text: '大量无关内容一页页划过。校园八卦、选课求助、闲置交易……都不是目标。', kind: 'narration' },
        { ui: 'off' },
        {
          ui: {
            type: 'post', title: '冷门收藏讨论帖 · 评论区',
            user: '匿名用户', time: '十一天前',
            text: '「不是氧化，是当年那批套色偏了。放干燥箱就行，别抛光。」'
          }
        },
        { text: '许久之后，在一个冷门收藏讨论帖的评论区，找到了风格匹配的回复。', kind: 'narration' },
        { text: '文字简短、理性，只回答技术层面的疑问，不透露任何个人信息，从不参与闲聊。', kind: 'narration' },
        { text: '发帖时间断断续续，间隔好几天才出现一次——和他「数日才简短对话」的习惯吻合。', kind: 'narration' },
        { ui: 'off' },
        { text: '他一直在论坛这个板块潜水，把自己保护得很好。', who: '主角', kind: 'inner' },
        { text: '线上交流只限于解答问题。现实里几乎没有人能把论坛账号和本校学生联系起来。', who: '主角', kind: 'inner' },
        { text: '原作的剧情里也没有提到这个论坛账号。', who: '主角', kind: 'inner' },
        { text: '——这是只有我现在才能挖到的隐藏信息。', who: '主角', kind: 'inner-strong' },
        { text: '再多翻几页，再也找不到更多相关留言。', kind: 'narration' },
        { text: '没有照片，没有年级，没有班级。身份完全隐藏。', kind: 'narration' },
        { text: '能拿到的线索就这么多。', who: '主角', kind: 'inner' },
        { text: '贸然发消息会显得突兀。得找一个合理的问题，贴合我们之间互相请教的相处方式。', who: '主角', kind: 'inner-strong' },
        { end: { title: '第一章 · 完', sub: '下一段：第二天', next: 'ch2' } }
      ]
    }
  };

  /* 便于以后加章节：返回章节列表顺序 */
  /* ---------------- 立绘排版演示（地址栏 #chars 打开） ---------------- */
  GAL.Chapters['demo'] = {
    id: 'demo',
    title: '立绘排版演示',
    place: '教学楼 · 走廊',
    steps: [
      { card: '立绘演示', sub: '非主角说话时的样子', hold: 1400 },
      { place: '教学楼 · 走廊' },
      { bg: 'assets/scene/bg-corridor1.webp', pos: '50% 50%', dur: 1200 },
      { chars: [
        { id: 'tong', src: 'assets/chars/tong-card.webp', pos: 'left' },
        { id: 'shuai', src: 'assets/chars/shuai-card.webp', pos: 'right' }
      ] },
      { text: '（两个人的立绘站在场景里。谁说话，谁亮起来。）', kind: 'narration' },
      { text: '……哦，是你啊。', who: '小郑', kind: 'say' },
      { text: '他先开的口。旁边那个没说话，眼睛也没抬。', kind: 'narration' },
      { text: '……', who: '小帅', kind: 'say' },
      { text: '（换一个人说话，高亮就会换过去。）', kind: 'narration' },
      { chars: [{ id: 'song', src: 'assets/chars/song-card.webp', pos: 'center' }] },
      { text: '（也可以只站一个人，居中。）', kind: 'narration' },
      { text: '……那，我先走了。', who: '阿松', kind: 'say' },
      { chars: [] },
      { text: '（立绘清空。）', kind: 'narration' },
      { end: { title: '演示结束', sub: '点画面返回标题' } }
    ]
  };

  /* ============================================================
     第二章 · 三个人，三种距离
     ============================================================ */
  GAL.Chapters['ch2'] = {
    id: 'ch2',
    title: '第二章 · 三个人，三种距离',
    place: '学生宿舍 · 早上',
    steps: [
      { card: '第二章', sub: '三个人，三种距离', hold: 2000 },
      { place: '学生宿舍 · 早上' },
      { bg: 'assets/scene/bg-dorm-morning.webp', pos: '50% 50%', dur: 1400 },
      { text: '早上，主角简单收拾好东西，出门吃早餐。', kind: 'narration' },
      { text: '一切照常——就像这具身体原本的主人每天做的那样。', kind: 'narration' },
      { place: '食堂 · 早上' },
      { bg: 'assets/scene/bg-canteen-in1.webp', pos: '50% 50%', dur: 1200 },
      { text: '随便吃了点东西，然后正常前往教学楼，上上午的专业课。', kind: 'narration' },

      /* ---------- 教室 · 小郑 ---------- */
      { place: '教学楼 · 教室' },
      { bg: 'assets/scene/bg-class-in1.webp', pos: '50% 50%', dur: 1300 },
      { text: '课堂一切平淡如常。', kind: 'narration' },
      { text: '班里能看到小郑的座位。', kind: 'narration' },
      { cg: 'assets/scene/ph-tong-class.webp', mode: 'inset', dur: 700 },
      { text: '对方安分听课，坐姿松弛，但背部习惯性地微微绷着。', kind: 'narration' },
      { text: '待人温和疏离，和所有人都保持着礼貌的安全距离。', kind: 'narration' },
      { text: '全程无对视、无交流。', kind: 'narration' },
      { cgOff: true },
      { text: '……完美契合「普通同班 ＋ 游戏搭子、不亲密」的现状。', who: '主角', kind: 'inner' },
      { affinity: { who: '小郑', value: 40, label: '普通朋友', hold: 3200 } },
      { text: '一上午的课程平稳结束。', kind: 'narration' },

      /* ---------- 中午 ---------- */
      { place: '食堂 · 中午' },
      { bg: 'assets/scene/bg-canteen-in2.webp', pos: '50% 50%', dur: 1200 },
      { text: '中午简单吃过午饭。', kind: 'narration' },
      { text: '主角没有回宿舍躺平，也没有上线打游戏。', kind: 'narration' },
      { text: '下午没课，去图书馆待一会。', who: '主角', kind: 'inner' },
      { text: '一是继续熟悉这个世界的环境和资料。', who: '主角', kind: 'inner' },
      { text: '二是随缘等一个契机——看看能不能遇见至今毫无交集的小帅。', who: '主角', kind: 'inner-strong' },

      /* ---------- 图书馆 · 第一次照面 ---------- */
      { place: '图书馆 · 下午' },
      { bg: 'assets/scene/bg-lib-in1.webp', pos: '50% 50%', dur: 1300 },
      { text: '主角拎着书包走进图书馆。', kind: 'narration' },
      { text: '室内安静，只有空调低低的嗡鸣，和偶尔翻书页的轻响。', kind: 'narration' },
      { text: '他沿着一排排书架缓步往前走，目光扫过书脊，一边找书一边在心里复盘计划。', kind: 'narration' },
      { text: '昨天和小郑约了游戏，查到阿松在论坛潜水。小帅到现在还没见到真人。', who: '主角', kind: 'inner' },
      { text: '我们现在完全互不相识，不能强行搭话。', who: '主角', kind: 'inner-strong' },
      { text: '主角拐进靠内侧的一排冷门书籍书架区。', kind: 'narration' },
      { text: '书架的缝隙之间，看见了一个独自坐着的身影。', kind: 'narration' },
      { cg: 'assets/scene/ph-shuai-lib-sit.webp', mode: 'inset', dur: 700 },
      { text: '是小帅。', who: '主角', kind: 'inner-strong' },
      { text: '他坐在靠窗的单人阅览桌，耳机戴在耳朵上，整个人几乎沉浸在自己的世界里。', kind: 'narration' },
      { text: '桌上摊开一本厚厚的画册，手边放着一杯冷水。', kind: 'narration' },
      { text: '他微微垂着头，指尖轻轻在书页上划动，注意力全都落在书本上，几乎没有留意周围走动的人。', kind: 'narration' },
      { cgOff: true },
      { text: '主角脚步放缓，悄悄确认了一眼，认出了他。', kind: 'narration' },
      { text: '是小帅。原作里总喜欢一个人待在安静地方，很少主动和旁人交流。', who: '主角', kind: 'inner' },
      { text: '主角只是从书架另一侧慢慢走过。走动带起一阵极轻的气流。', kind: 'narration' },
      { text: '小帅隐约察觉到有人路过，抬眼随意往这边看了一眼。', kind: 'narration' },
      { text: '目光短暂相撞，只有短短半秒。', kind: 'narration' },
      { text: '他没有表情，没有开口，也没有产生好奇——仅仅下意识瞥一眼路过的陌生人，随即低下头，重新把视线落回画册上。', kind: 'narration' },
      { text: '两人没有一句交谈。', kind: 'narration' },
      { text: '主角没有停下脚步，继续往前走，去找自己想查阅的书籍。', kind: 'narration' },
      { text: '这就是好感 0 该有的距离。', who: '主角', kind: 'inner' },
      { text: '对他来说，我只是图书馆里一个普通路过的学生。', who: '主角', kind: 'inner' },
      { text: '先记住他的模样，后面再寻找合理、不突兀的机会产生交集——不能像打游戏一样硬凑上去。', who: '主角', kind: 'inner-strong' },

      { bg: 'assets/scene/bg-lib-in2.webp', pos: '50% 50%', dur: 1200 },
      { text: '主角走到目标书架，抽出一本书，找了一张距离小帅不远、但互不打扰的空座位坐下。', kind: 'narration' },
      { text: '摊开手里借来的书，安静翻阅。', kind: 'narration' },
      { text: '指尖轻轻翻过书页，目光大多落在文字上，只有在翻页的间隙，才会不动声色地用余光留意斜前方的身影。', kind: 'narration' },
      { text: '小帅依旧戴着耳机，身子微微前倾，专注地盯着桌上那本画册。', kind: 'narration' },
      { text: '他很少抬头，偶尔抬手抿一口手边的冷水，动作轻缓，几乎不发出声响——仿佛周遭所有来往的人和动静，都和他隔了一层。', kind: 'narration' },
      { text: '他没有察觉到远处有人在留意自己，完全沉浸在书本构建的世界里。', kind: 'narration' },
      { text: '时间慢慢流逝，窗外的阳光在桌面上缓缓偏移。', kind: 'narration' },
      { text: '图书馆里始终只有细碎的翻书声与空调低鸣。', kind: 'narration' },
      { text: '他安安静静，不主动找人搭话，也不在意旁人的眼光。', who: '主角', kind: 'inner' },
      { text: '原作里他总是独自待着。现在亲眼见到，才更能体会那种和外界保持距离的感觉。', who: '主角', kind: 'inner' },
      { text: '不能贸然上前搭话。现在我们还完全陌生，突兀的靠近只会引起戒备。', who: '主角', kind: 'inner-strong' },

      { text: '不知过了多久，小帅抬手按下暂停，摘下耳机，合上书页。', kind: 'narration' },
      { cg: 'assets/scene/ph-shuai-lib-leave.webp', mode: 'inset', dur: 700 },
      { text: '他慢条斯理地收拢桌上的东西：把画册放进帆布包，拧紧水杯盖子，将桌面简单收拾干净，没有留下一点杂物。', kind: 'narration' },
      { text: '他起身，背上背包，目光平视前方，沿着阅览桌之间的过道，朝图书馆出口走去。', kind: 'narration' },
      { text: '路过主角这一排座位时，视线平直向前，没有看向主角这边，径直走过。', kind: 'narration' },
      { cgOff: true },
      { text: '主角只是抬眼，安静目送他的背影消失在书架拐角。', kind: 'narration' },
      { text: '第一次见面，到此为止就足够。', who: '主角', kind: 'inner' },
      { text: '至少记住了他的样貌，知道他习惯在图书馆这个区域看书。', who: '主角', kind: 'inner' },
      { text: '以后如果要产生交集，可以从书籍、画册这类共同的切入点入手，会自然很多。', who: '主角', kind: 'inner-strong' },
      { text: '主角收回视线，重新落回自己摊开的书本上。图书馆又恢复成原本安静的模样。', kind: 'narration' },
      { text: '他合上书本，也收拾东西离开图书馆，在校园里随便走走。', kind: 'narration' },

      /* ---------- 湖畔 · 傍晚 ---------- */
      { place: '校园湖畔石堤 · 傍晚' },
      { bg: 'assets/scene/bg-lake.webp', pos: '50% 50%', dur: 1400 },
      { text: '主角停下，靠着护栏望向水面。', kind: 'narration' },
      { text: '小郑、阿松、小帅，三个人各有各的隔绝方式。', who: '主角', kind: 'inner' },
      { text: '小郑维持礼貌的距离，阿松躲进网络匿名的壳里，小帅干脆沉浸在自己的世界。', who: '主角', kind: 'inner' },
      { text: '我不能像玩游戏一样触发固定剧情，每一步都得贴合现实，不然只会弄巧成拙。', who: '主角', kind: 'inner' },
      { text: '回家的条件依旧不明，只能慢慢收集线索。', who: '主角', kind: 'inner-strong' },
      { text: '短暂驻足之后，主角继续往前走，沿着湖边小路慢悠悠绕行。', kind: 'narration' },
      { text: '没有刻意去找任何人，只是单纯感受这个世界，把一处处场景和记忆里的游戏剧情对照，默默标记可以利用的契机。', kind: 'narration' },
      { place: '校园 · 夕阳' },
      { bg: 'assets/scene/bg-teach-1.webp', pos: '50% 50%', dur: 1200 },
      { text: '天色渐渐向傍晚偏移，夕阳的色调慢慢染在教学楼外墙。', kind: 'narration' },

      /* ---------- 又一次遇见 · 他先开口 ---------- */
      { place: '校园湖畔 · 长椅' },
      { bg: 'assets/scene/bg-lake.webp', pos: '50% 58%', dur: 1200 },
      { text: '转过湖边的矮树丛，主角一眼看见了长椅上的小帅。', kind: 'narration' },
      { cg: 'assets/scene/ph-shuai-lake-bench.webp', mode: 'inset', dur: 700 },
      { text: '明明刚才在图书馆亲眼看着他收拾背包离开，本以为他会直接回宿舍——没想到他独自坐在这里，腿上依旧放着那本画册。', kind: 'narration' },
      { cgOff: true },
      { text: '主角脚步顿了一下，本来打算安静绕过去，不打扰对方。', kind: 'narration' },
      { text: '可就在他准备侧身走过的瞬间——', kind: 'narration' },
      { text: '小帅没有抬头，淡淡开口，像是早就感知到了来人。', kind: 'narration' },
      { chars: [{ id: 'shuai', src: 'assets/chars/shuai-card.webp', pos: 'right' }] },
      { text: '你不用躲。我在图书馆就看见你了。', who: '小帅', kind: 'say' },
      { text: '主角僵在原地。', kind: 'narration' },
      { text: '果然。', who: '主角', kind: 'inner-strong' },
      { text: '我自以为隐蔽的余光观察，全部被捕捉到了。', who: '主角', kind: 'inner' },
      { text: '原作里初次相遇根本没有这段对话。', who: '主角', kind: 'inner' },
      { text: '这个世界的人，不完全跟着游戏剧本走。', who: '主角', kind: 'inner-strong' },
      { cg: 'assets/scene/ph-shuai-look-up.webp', mode: 'inset', dur: 700 },
      { text: '小帅这时才缓缓抬起头，目光平静地落在主角身上——没有敌意，也没有好奇，只是一种冷静的审视。', kind: 'narration' },
      { text: '他抬手，轻轻摩挲画册的封皮。', kind: 'narration' },
      { cgOff: true },
      { text: '你一直在留意我。为什么？', who: '小帅', kind: 'say' },
      { text: '湖面上晚风卷起涟漪，安静的湖畔只剩下风吹草木的声响。', kind: 'narration' },
      { text: '两人隔着两三米的距离。', kind: 'narration' },
      { text: '现在不能暴露穿越的秘密，也不能直白说我看过关于你的游戏剧情。', who: '主角', kind: 'inner' },
      { text: '怎么回答，决定我们第一次正式对话留下的印象。', who: '主角', kind: 'inner-strong' },
      {
        choice: {
          prompt: '怎么回答他',
          options: [
            { text: '坦诚，温和解释：「刚刚在图书馆看到你的画册，题材很感兴趣，所以多看了两眼。」', goto: 'a_honest', flag: 'shuai_honest', aff: { shuai: 2 }, notice: '好感度 +2' },
            { text: '装傻，轻描淡写：「抱歉，没有刻意留意，只是视线刚好落在你那边。」', goto: 'a_vague', flag: 'shuai_vague', notice: '好感度无变化' }
          ]
        }
      },

      /* ---------------- 分支 1：坦诚 ---------------- */
      { label: 'a_honest' },
      { text: '主角放软语气，平静地回话。', kind: 'narration' },
      { text: '刚刚在图书馆看到你的画册，题材很感兴趣，所以多看了两眼。不是有意打扰你。', who: '主角', kind: 'say' },
      { text: '小帅静静地盯着主角几秒。紧绷的肩膀，微微放松下来。', kind: 'narration' },
      { text: '他低头看向腿上的画册，指尖轻轻叩了叩封面。', kind: 'narration' },
      { text: '很少有人会留意这本。大部分人扫一眼就跳过。', who: '小帅', kind: 'say' },
      { text: '他没有继续追问，只是把画册微微抬起一点，露出封面上偏暗黑幻想风格的插画。', kind: 'narration' },
      { text: '你喜欢这类？', who: '小帅', kind: 'say' },
      { text: '坦诚反而让他放下戒备。', who: '主角', kind: 'inner' },
      { text: '他在意的不是被注视这件事，而是能不能有人看懂他喜欢的东西。', who: '主角', kind: 'inner' },
      { text: '这是一个好的开端，但不能操之过急。', who: '主角', kind: 'inner-strong' },
      { text: '主角向前走近半步，目光落在画册封面，慢慢说出自己对画面的看法。', kind: 'narration' },
      { text: '两人就画册的画风、故事设定简单交谈。小帅话不多，但愿意主动补充几句细节——不再是全然封闭的状态。', kind: 'narration' },
      { text: '夕阳一点点沉向远处楼宇，光线慢慢变暗。', kind: 'narration' },
      { text: '小帅抬眼瞥了一眼天色，合上画册，放进帆布包。', kind: 'narration' },
      { text: '我该回去了。', who: '小帅', kind: 'say' },
      { text: '主角点头，没有挽留。', kind: 'narration' },
      { text: '好，那下次有机会再聊聊。', who: '主角', kind: 'say' },
      { text: '小帅微微颔首，起身沿着湖岸小路离开。主角站在原地，目送他走远。', kind: 'narration' },
      { text: '第一次对话顺利结束。拿到了不错的开局。', who: '主角', kind: 'inner' },
      { text: '不过不能急于推进，需要等下一次自然的碰面机会。', who: '主角', kind: 'inner-strong' },
      { chars: [] },
      { goto: 'main_road' },

      /* ---------------- 分支 2：装傻 ---------------- */
      { label: 'a_vague' },
      { text: '主角微微摇头，语气尽量自然。', kind: 'narration' },
      { text: '抱歉，没有刻意留意，只是视线刚好落在你那边。', who: '主角', kind: 'say' },
      { text: '小帅的眼神没有变化，淡淡的审视感没有消散。', kind: 'narration' },
      { text: '他没有反驳主角的话，但眼底掠过一丝不易察觉的怀疑——明显没有完全相信这套说辞，只是淡淡颔首。', kind: 'narration' },
      { text: '是吗。', who: '小帅', kind: 'say' },
      { text: '简短三个字之后，他收回目光，重新垂头看向画册，不再主动搭话。', kind: 'narration' },
      { text: '等于关上了继续交流的窗口。气氛变得疏远、尴尬。', kind: 'narration' },
      { text: '他感知力很强，这种敷衍的说辞糊弄不住。', who: '主角', kind: 'inner' },
      { text: '只是维持住陌生人的边界，没有产生负面印象——但这次机会直接浪费掉了。', who: '主角', kind: 'inner-strong' },
      { text: '空气安静下来，只剩下风吹芦苇的沙沙声。没有更多对话可以继续。', kind: 'narration' },
      { text: '主角意识到，再站在这里只会更加别扭。', kind: 'narration' },
      { text: '那我不打扰你了。', who: '主角', kind: 'say' },
      { text: '主角轻轻说完，便继续沿着湖边小路往前走。没有回头。', kind: 'narration' },
      { text: '小帅自始至终没有再抬头。', kind: 'narration' },
      { text: '这次错过了拉近关系的契机。', who: '主角', kind: 'inner' },
      { text: '下次再遇见他，得找更合理、没法敷衍的切入点。', who: '主角', kind: 'inner-strong' },
      { chars: [] },
      { goto: 'main_road' },

      /* ================= 双线并线 ================= */
      { label: 'main_road' },
      { place: '校园主干道 · 傍晚' },
      { bg: 'assets/scene/bg-road1.webp', pos: '50% 50%', dur: 1400 },
      { text: '不管是和小帅简单聊过画册后目送对方离开，还是草草道别独自离开湖畔——最后，主角都会走到这条连接宿舍区的主干道。', kind: 'narration' },
      { text: '天色进一步变暗，街边路灯次第亮起。', kind: 'narration' },
      { text: '主角走在路上，低头掏出手机。', kind: 'narration' },
      {
        ui: {
          type: 'post', title: '校园匿名论坛 · 新推送',
          user: '匿名发帖人', time: '十分钟前',
          text: '《计算中心藏品存放点，最近小心，有人在查》'
        }
      },
      { text: '屏幕弹出一条新推送，来自校园匿名论坛。标题很不起眼。', kind: 'narration' },
      { text: '计算中心？那是原作里阿松存放藏品的地方。', who: '主角', kind: 'inner-strong' },
      { text: '主角停下脚步，指尖点开帖子。发帖人没有头像，正文很短，只写了寥寥几句，没有署名。', kind: 'narration' },
      {
        ui: {
          type: 'note', title: '帖子正文',
          lines: ['最近不要往计算中心侧门储物间放东西。', '有学生在附近徘徊。', '管理员最近会不定期巡查。']
        }
      },
      { text: '主角心脏微微一紧。', kind: 'narration' },
      { text: '是阿松吗？还是别的知情者？', who: '主角', kind: 'inner' },
      { text: '不管刚才和小帅的对话是顺利还是平淡，这条消息都改变了现状。', who: '主角', kind: 'inner' },
      { text: '阿松的秘密据点，有暴露的风险。', who: '主角', kind: 'inner-strong' },
      { ui: 'off' },
      { text: '远处宿舍楼的灯火，一盏盏亮起。', kind: 'narration' },
      { text: '今晚回去要仔细看看这个帖子下面的评论。', who: '主角', kind: 'inner' },
      { text: '阿松这条线，突然出现变数了。', who: '主角', kind: 'inner-strong' },
      { end: { title: '第二章 · 待续', sub: '下一段：帖子下面的评论' } }
    ]
  };

  GAL.chapterOrder = ['ch1', 'ch2'];

  /* ============================================================
     主角 × 三人的关系（最新版 · 以此为准）
     好感档位：0 陌生 → 20 眼熟 → 40 普通朋友/友好 → 60 在意 → 80 偏爱 → 100 唯一
     ============================================================ */
  GAL.Cast = {
    tong: {
      id: 'tong', name: '小郑', fullName: '郑桐', aliases: ['桐桐'],
      age: 22, height: '175cm / 60kg', college: '社会学 · 大三',
      aff: 40, affLabel: '普通朋友',
      rel: '同班同学 · 游戏搭子',
      line: '线下是普通朋友，可以正常搭话，但并不亲密',
      game: '小郑带主角。两人之间的专属黑话是 MJ。除此之外没有固定习惯。',
      jealous: '看见主角和别人组队会轻微失落。不会打断，会安静等主角结束，再一起玩。',
      growth: '克制试探',
      heart: '沿用原始人设：恐惧善意裹挟、人情枷锁、失去随时退出的权利',
      extra: '没有主角专属的心软特权，没有针对主角的特殊雷点，没有额外隐藏想法与关系阻碍',
      img: 'assets/chars/tong-card.webp'
    },
    song: {
      id: 'song', name: '阿松', aliases: [],
      age: 20, height: '168cm / 60kg', college: '计算机科学系 · 大二',
      aff: 15, affLabel: '网友',
      rel: '同校 · 匿名网友 · 线下从未见面',
      line: '线上聊天频次低，几天才简单聊几句，很少分享私事；交流大多是互相请教不懂的问题',
      gap: '信息差：主角完全不了解阿松的旧物收藏癖好、雷点与内心矛盾',
      jealous: '不在意，不吃醋。主角和其他人来往他无所谓。',
      growth: '待定',
      heart: '沿用原始人设：渴望联结，但恐惧接触落到现实',
      extra: '没有对主角的特殊区别对待，没有隐藏想法，暂无好感上涨后的吃醋预案',
      img: 'assets/chars/song-card.webp'
    },
    shuai: {
      id: 'shuai', name: '小帅', aliases: [],
      age: 20, height: '182cm / 65kg', college: '非学生 · 自由职业',
      aff: 0, affLabel: '未认识',
      rel: '尚未相识',
      line: '——', jealous: '——', growth: '——',
      heart: '——（尚未相识，暂无互动细节与感情线设定）',
      extra: '——',
      img: 'assets/chars/shuai-card.webp'
    }
  };
})(window);
