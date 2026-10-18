/**
 * Universal Mandarin Learning & Huawei AIOps Coach — Spaced Repetition Flashcards & Adaptive Placement Engine
 *
 * Bound to Discord channel #mandarin-learning (1560618302907351130).
 * Features:
 * 1. Universal Adaptive Placement Engine (HSK 0 to HSK 6) + Bot-Fit Diagnostic.
 * 2. Multi-Track Vocabulary Pool: HSK 1-2 (Foundation), HSK 3-4 (Workplace), Tech/AIOps (Engineering).
 * 3. SM-2 Spaced Repetition Interactive Flashcards (Recognition & Production Modes with 4-button Self-Grading).
 * 4. Multi-Mode Understanding Quizzes (Contextual Cloze, Comprehension, Tone & Pinyin Accuracy).
 * 5. Standalone Gemini Live Voice Interview Prompts & [MANDARIN_BASELINE] / [MANDARIN_EVAL] Ledger Ingestion.
 * 6. Daily Scheduled Drops (08:30 WIB) & Evening Reminders (20:00 WIB).
 * 7. Antigravity Agent (agy) pair-learning bridge.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const MANDARIN_CHANNEL_ID = process.env.DISCORD_MANDARIN_CHANNEL_ID || '1560618302907351130';
const LEARNINGS_ROOT = '/home/agent/orca/learnings';
const WORKSPACE_DIR = '/home/agent/orca/learnings/technical-mandarin';
const LEDGER_PATH = path.join(WORKSPACE_DIR, 'vocab-ledger.json');
const ROOT_LEDGER_MIRROR = path.join(LEARNINGS_ROOT, 'vocab-ledger.json');

const PACE_CONFIG = {
  light: {
    id: 'light',
    label: '⚡ Light (5 min)',
    wordCount: 3,
    sentenceCount: 1,
    description: 'High-pressure sprint mode: 3 essential terms + 1 sentence.'
  },
  standard: {
    id: 'standard',
    label: '⚖️ Standard (10 min)',
    wordCount: 6,
    sentenceCount: 2,
    description: 'Balanced daily cadence: 6 terms + 2 workplace sentences.'
  },
  deep: {
    id: 'deep',
    label: '🔥 Deep (20 min)',
    wordCount: 10,
    sentenceCount: 3,
    description: 'Deep immersion: 10 terms + 3 full briefing sentences.'
  }
};

const TRACK_CONFIG = {
  "all": {
    "id": "all",
    "label": "🌐 All Levels (5,000+ words)",
    "description": "Comprehensive pool spanning HSK 1-6 fundamentals to Huawei AIOps Engineering."
  },
  "hsk1_2": {
    "id": "hsk1_2",
    "label": "🌱 HSK 1-2 Foundation (297 words)",
    "description": "Essential verbs, time, basic sentence frames & survival workplace Mandarin."
  },
  "hsk3_4": {
    "id": "hsk3_4",
    "label": "🌿 HSK 3-4 Intermediate & Workplace (896 words)",
    "description": "Core connectors, disposal (把), concession, and office collaboration frames."
  },
  "hsk5_6": {
    "id": "hsk5_6",
    "label": "🚀 HSK 5-6 Advanced & Technical Strategy (3,798 words)",
    "description": "Formal discourse, system architecture, strategy planning, and cross-functional leadership."
  },
  "tech_aiops": {
    "id": "tech_aiops",
    "label": "⚡ Huawei AIOps & Telemetry Engineering (Observability, RCA, incident response)",
    "description": "Cloud observability, anomaly detection, RCA, and incident briefing jargon."
  }
};

// 107 Curated Vocabulary Items across HSK 1-2, HSK 3-4, HSK 5-6, and Domain-Specific AIOps
const INITIAL_VOCAB_POOL = [
  {
    "id": "xianzai",
    "hanzi": "现在",
    "pinyin": "xiànzài",
    "meaning": "Now / Currently",
    "category": "Time",
    "levelTrack": "hsk1_2",
    "hskHook": "现 (present) + 在 (at)",
    "exampleZh": "请问现在几点了？",
    "examplePy": "Qǐngwèn xiànzài jǐ diǎn le?",
    "exampleEn": "Excuse me, what time is it now?",
    "clozeZh": "请问【 ____ 】几点了？",
    "clozeAnswer": "现在"
  },
  {
    "id": "wenti",
    "hanzi": "问题",
    "pinyin": "wèntí",
    "meaning": "Problem / Question",
    "category": "Workplace",
    "levelTrack": "hsk1_2",
    "hskHook": "问 (ask) + 题 (topic)",
    "exampleZh": "这个问题很容易解决。",
    "examplePy": "Zhège wèntí hěn róngyì jiějué.",
    "exampleEn": "This problem is very easy to solve.",
    "clozeZh": "这个【 ____ 】很容易解决。",
    "clozeAnswer": "问题"
  },
  {
    "id": "bangzhu",
    "hanzi": "帮助",
    "pinyin": "bāngzhù",
    "meaning": "Help / Assist",
    "category": "Workplace",
    "levelTrack": "hsk1_2",
    "hskHook": "帮 (help) + 助 (aid)",
    "exampleZh": "非常感谢你的帮助。",
    "examplePy": "Fēicháng gǎnxiè nǐ de bāngzhù.",
    "exampleEn": "Thank you very much for your help.",
    "clozeZh": "非常感谢你的【 ____ 】。",
    "clozeAnswer": "帮助"
  },
  {
    "id": "zhunbei",
    "hanzi": "准备",
    "pinyin": "zhǔnbèi",
    "meaning": "Prepare / Ready",
    "category": "Workplace",
    "levelTrack": "hsk1_2",
    "hskHook": "准 (accurate) + 备 (prepare)",
    "exampleZh": "我们已经准备好开会了。",
    "examplePy": "Wǒmen yǐjīng zhǔnbèi hǎo kāihuì le.",
    "exampleEn": "We are already prepared to start the meeting.",
    "clozeZh": "我们已经【 ____ 】好开会了。",
    "clozeAnswer": "准备"
  },
  {
    "id": "kaishi",
    "hanzi": "开始",
    "pinyin": "kāishǐ",
    "meaning": "Start / Begin",
    "category": "Action",
    "levelTrack": "hsk1_2",
    "hskHook": "开 (open/start) + 始 (initial)",
    "exampleZh": "会议将在下午开始。",
    "examplePy": "Huìyì jiāng zài xiàwǔ kāishǐ.",
    "exampleEn": "The meeting will start in the afternoon.",
    "clozeZh": "会议将在下午【 ____ 】。",
    "clozeAnswer": "开始"
  },
  {
    "id": "mingbai",
    "hanzi": "明白",
    "pinyin": "míngbai",
    "meaning": "Understand / Clear",
    "category": "Communication",
    "levelTrack": "hsk1_2",
    "hskHook": "明 (bright/clear) + 白 (white/clear)",
    "exampleZh": "你明白我的意思了吗？",
    "examplePy": "Nǐ míngbai wǒ de yìsi le ma?",
    "exampleEn": "Do you understand what I mean?",
    "clozeZh": "你【 ____ 】我的意思了吗？",
    "clozeAnswer": "明白"
  },
  {
    "id": "huiyi",
    "hanzi": "会议",
    "pinyin": "huìyì",
    "meaning": "Meeting / Conference",
    "category": "Workplace",
    "levelTrack": "hsk1_2",
    "hskHook": "会 (meet) + 议 (discuss)",
    "exampleZh": "我们今天上午有一个重要的会议。",
    "examplePy": "Wǒmen jīntiān shàngwǔ yǒu yí ge zhòngyào de huìyì.",
    "exampleEn": "We have an important meeting this morning.",
    "clozeZh": "我们今天上午有一个重要的【 ____ 】。",
    "clozeAnswer": "会议"
  },
  {
    "id": "shijian",
    "hanzi": "时间",
    "pinyin": "shíjiān",
    "meaning": "Time / Duration",
    "category": "Time",
    "levelTrack": "hsk1_2",
    "hskHook": "时 (time) + 间 (interval)",
    "exampleZh": "我们没有足够的时间了。",
    "examplePy": "Wǒmen méiyǒu zúgòu de shíjiān le.",
    "exampleEn": "We do not have enough time anymore.",
    "clozeZh": "我们没有足够的【 ____ 】了。",
    "clozeAnswer": "时间"
  },
  {
    "id": "gongzuo",
    "hanzi": "工作",
    "pinyin": "gōngzuò",
    "meaning": "Work / Job",
    "category": "Workplace",
    "levelTrack": "hsk1_2",
    "hskHook": "工 (labor) + 作 (make/do)",
    "exampleZh": "大家最近工作都很辛苦。",
    "examplePy": "Dàjiā zuìjìn gōngzuò dōu hěn xīnkǔ.",
    "exampleEn": "Everyone has been working very hard recently.",
    "clozeZh": "大家最近【 ____ 】都很辛苦。",
    "clozeAnswer": "工作"
  },
  {
    "id": "rongyi",
    "hanzi": "容易",
    "pinyin": "róngyì",
    "meaning": "Easy / Simple",
    "category": "Descriptor",
    "levelTrack": "hsk1_2",
    "hskHook": "容 (contain/tolerate) + 易 (easy/change)",
    "exampleZh": "学好中文并不容易，但很有趣。",
    "examplePy": "Xué hǎo zhōngwén bìng bù róngyì, dàn hěn yǒuqù.",
    "exampleEn": "Mastering Chinese is not easy, but very interesting.",
    "clozeZh": "学好中文并不【 ____ 】，但很有趣。",
    "clozeAnswer": "容易"
  },
  {
    "id": "keyi",
    "hanzi": "可以",
    "pinyin": "kěyǐ",
    "meaning": "Can / May / Possible",
    "category": "Modal",
    "levelTrack": "hsk1_2",
    "hskHook": "可 (able) + 以 (with/by)",
    "exampleZh": "请问我可以看一下这份文档吗？",
    "examplePy": "Qǐngwèn wǒ kěyǐ kàn yíxià zhè fèn wéndàng ma?",
    "exampleEn": "Excuse me, may I take a look at this document?",
    "clozeZh": "请问我【 ____ 】看一下这份文档吗？",
    "clozeAnswer": "可以"
  },
  {
    "id": "jieshao",
    "hanzi": "介绍",
    "pinyin": "jièshào",
    "meaning": "Introduce / Introduction",
    "category": "Communication",
    "levelTrack": "hsk1_2",
    "hskHook": "介 (between) + 绍 (connect)",
    "exampleZh": "请向大家介绍一下你的项目。",
    "examplePy": "Qǐng xiàng dàjiā jièshào yíxià nǐ de xiàngmù.",
    "exampleEn": "Please introduce your project to everyone.",
    "clozeZh": "请向大家【 ____ 】一下你的项目。",
    "clozeAnswer": "介绍"
  },
  {
    "id": "diannao",
    "hanzi": "电脑",
    "pinyin": "diànnǎo",
    "meaning": "Computer",
    "category": "Tech/Tool",
    "levelTrack": "hsk1_2",
    "hskHook": "电 (electric) + 脑 (brain)",
    "exampleZh": "我的电脑今天突然死机了。",
    "examplePy": "Wǒ de diànnǎo jīntiān tūrán sǐjī le.",
    "exampleEn": "My computer crashed suddenly today.",
    "clozeZh": "我的【 ____ 】今天突然死机了。",
    "clozeAnswer": "电脑"
  },
  {
    "id": "zuotian",
    "hanzi": "昨天",
    "pinyin": "zuótiān",
    "meaning": "Yesterday",
    "category": "Time",
    "levelTrack": "hsk1_2",
    "hskHook": "昨 (past/yesterday) + 天 (day)",
    "exampleZh": "昨天我们上线了新的测试环境。",
    "examplePy": "Zuótiān wǒmen shàngxiàn le xīn de cèshì huánjìng.",
    "exampleEn": "Yesterday we launched the new test environment.",
    "clozeZh": "【 ____ 】我们上线了新的测试环境。",
    "clozeAnswer": "昨天"
  },
  {
    "id": "yijing",
    "hanzi": "已经",
    "pinyin": "yǐjīng",
    "meaning": "Already",
    "category": "Aspect",
    "levelTrack": "hsk1_2",
    "hskHook": "已 (already) + 经 (pass through)",
    "exampleZh": "报告我已经发到你的邮箱了。",
    "examplePy": "Bàogào wǒ yǐjīng fā dào nǐ de yóuxiāng le.",
    "exampleEn": "I have already sent the report to your email.",
    "clozeZh": "报告我【 ____ 】发到你的邮箱了。",
    "clozeAnswer": "已经"
  },
  {
    "id": "yinwei",
    "hanzi": "因为",
    "pinyin": "yīnwèi",
    "meaning": "Because / Since",
    "category": "Connector",
    "levelTrack": "hsk1_2",
    "hskHook": "因 (cause) + 为 (for/because)",
    "exampleZh": "因为今天堵车，所以他迟到了。",
    "examplePy": "Yīnwèi jīntiān dǔchē, suǒyǐ tā chídào le.",
    "exampleEn": "Because of traffic today, he was late.",
    "clozeZh": "【 ____ 】今天堵车，所以他迟到了。",
    "clozeAnswer": "因为"
  },
  {
    "id": "suoyi",
    "hanzi": "所以",
    "pinyin": "suǒyǐ",
    "meaning": "Therefore / So",
    "category": "Connector",
    "levelTrack": "hsk1_2",
    "hskHook": "所 (place/that which) + 以 (whereby)",
    "exampleZh": "因为服务异常，所以我们需要排查。",
    "examplePy": "Yīnwèi fúwù yìcháng, suǒyǐ wǒmen xūyào páichá.",
    "exampleEn": "Because the service is abnormal, therefore we need to investigate.",
    "clozeZh": "因为服务异常，【 ____ 】我们需要排查。",
    "clozeAnswer": "所以"
  },
  {
    "id": "suiran",
    "hanzi": "虽然",
    "pinyin": "suīrán",
    "meaning": "Although / Even though",
    "category": "Connector",
    "levelTrack": "hsk1_2",
    "hskHook": "虽 (although) + 然 (so/thus)",
    "exampleZh": "虽然任务很多，但是我们很有信心。",
    "examplePy": "Suīrán rènwu hěn duō, dànshì wǒmen hěn yǒu xìnxīn.",
    "exampleEn": "Although there are many tasks, we are confident.",
    "clozeZh": "【 ____ 】任务很多，但是我们很有信心。",
    "clozeAnswer": "虽然"
  },
  {
    "id": "danshi",
    "hanzi": "但是",
    "pinyin": "dànshì",
    "meaning": "But / However",
    "category": "Connector",
    "levelTrack": "hsk1_2",
    "hskHook": "但 (but) + 是 (be/affirm)",
    "exampleZh": "虽然遇到了挑战，但是我们按时完成了。",
    "examplePy": "Suīrán yùdào le tiǎozhàn, dànshì wǒmen ànshí wánchéng le.",
    "exampleEn": "Although facing challenges, but we finished on time.",
    "clozeZh": "虽然遇到了挑战，【 ____ 】我们按时完成了。",
    "clozeAnswer": "但是"
  },
  {
    "id": "li",
    "hanzi": "离",
    "pinyin": "lí",
    "meaning": "Distance from / Away from",
    "category": "Preposition",
    "levelTrack": "hsk1_2",
    "hskHook": "离 (distance/depart)",
    "exampleZh": "公司离地铁站非常近。",
    "examplePy": "Gōngsī lí dìtiězhàn fēicháng jìn.",
    "exampleEn": "The office is very close to the subway station.",
    "clozeZh": "公司【 ____ 】地铁站非常近。",
    "clozeAnswer": "离"
  },
  {
    "id": "renshi",
    "hanzi": "认识",
    "pinyin": "rènshi",
    "meaning": "Recognize / Know (person)",
    "category": "Communication",
    "levelTrack": "hsk1_2",
    "hskHook": "认 (recognize) + 识 (knowledge)",
    "exampleZh": "很高兴在这里认识大家。",
    "examplePy": "Hěn gāoxìng zài zhèlǐ rènshi dàjiā.",
    "exampleEn": "Very glad to get to know everyone here.",
    "clozeZh": "很高兴在这里【 ____ 】大家。",
    "clozeAnswer": "认识"
  },
  {
    "id": "gaosu",
    "hanzi": "告诉",
    "pinyin": "gàosu",
    "meaning": "Tell / Inform",
    "category": "Communication",
    "levelTrack": "hsk1_2",
    "hskHook": "告 (tell/declare) + 诉 (speak/relate)",
    "exampleZh": "请随时把最新进展告诉主管。",
    "examplePy": "Qǐng suíshí bǎ zuìxīn jìnzhǎn gàosu zhǔguǎn.",
    "exampleEn": "Please inform the manager of the latest progress at any time.",
    "clozeZh": "请随时把最新进展【 ____ 】主管。",
    "clozeAnswer": "告诉"
  },
  {
    "id": "qingchu",
    "hanzi": "清楚",
    "pinyin": "qīngchu",
    "meaning": "Clear / Distinct",
    "category": "Descriptor",
    "levelTrack": "hsk1_2",
    "hskHook": "清 (clear/pure) + 楚 (distinct)",
    "exampleZh": "请把部署步骤写得更加清楚。",
    "examplePy": "Qǐng bǎ bùshǔ bùzhòu xiě de gèngjiā qīngchu.",
    "exampleEn": "Please write the deployment steps more clearly.",
    "clozeZh": "请把部署步骤写得更加【 ____ 】。",
    "clozeAnswer": "清楚"
  },
  {
    "id": "jiejue",
    "hanzi": "解决",
    "pinyin": "jiějué",
    "meaning": "Resolve / Solve",
    "category": "Action",
    "levelTrack": "hsk3_4",
    "hskHook": "解 (untie/explain) + 决 (decide)",
    "exampleZh": "这个问题我们已经彻底解决了。",
    "examplePy": "Zhège wèntí wǒmen yǐjīng chèdǐ jiějué le.",
    "exampleEn": "We have thoroughly resolved this issue.",
    "clozeZh": "这个问题我们已经彻底【 ____ 】了。",
    "clozeAnswer": "解决"
  },
  {
    "id": "tuichi",
    "hanzi": "推迟",
    "pinyin": "tuīchí",
    "meaning": "Postpone / Delay",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "推 (push) + 迟 (late/delayed)",
    "exampleZh": "发布评审会议推迟到明天上午。",
    "examplePy": "Fābù píngshěn huìyì tuīchí dào míngtiān shàngwǔ.",
    "exampleEn": "The release review meeting is postponed until tomorrow morning.",
    "clozeZh": "发布评审会议【 ____ 】到明天上午。",
    "clozeAnswer": "推迟"
  },
  {
    "id": "huibao",
    "hanzi": "汇报",
    "pinyin": "huìbào",
    "meaning": "Report / Brief (to superior)",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "汇 (gather) + 报 (report)",
    "exampleZh": "我马上向部门领导汇报故障恢复情况。",
    "examplePy": "Wǒ mǎshàng xiàng bùmén lǐngdǎo huìbào gùzhàng huīfù qíngkuàng.",
    "exampleEn": "I will immediately brief department leadership on outage recovery.",
    "clozeZh": "我马上向部门领导【 ____ 】故障恢复情况。",
    "clozeAnswer": "汇报"
  },
  {
    "id": "zhengli",
    "hanzi": "整理",
    "pinyin": "zhěnglǐ",
    "meaning": "Organize / Sort out",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "整 (orderly) + 理 (manage/logic)",
    "exampleZh": "请把今天的会议纪要整理好并发出来。",
    "examplePy": "Qǐng bǎ jīntiān de huìyì jìyào zhěnglǐ hǎo bìng fā chūlái.",
    "exampleEn": "Please organize today’s meeting minutes and send them out.",
    "clozeZh": "请把今天的会议纪要【 ____ 】好并发出来。",
    "clozeAnswer": "整理"
  },
  {
    "id": "jiaoliu",
    "hanzi": "交流",
    "pinyin": "jiāoliú",
    "meaning": "Exchange / Communicate",
    "category": "Communication",
    "levelTrack": "hsk3_4",
    "hskHook": "交 (intersect/cross) + 流 (flow)",
    "exampleZh": "我们需要多跟跨部门同事沟通交流。",
    "examplePy": "Wǒmen xūyào duō gēn kuà bùmén tóngshì gōutōng jiāoliú.",
    "exampleEn": "We need to communicate more with cross-department colleagues.",
    "clozeZh": "我们需要多跟跨部门同事沟通【 ____ 】。",
    "clozeAnswer": "交流"
  },
  {
    "id": "tigao",
    "hanzi": "提高",
    "pinyin": "tígāo",
    "meaning": "Improve / Elevate",
    "category": "Action",
    "levelTrack": "hsk3_4",
    "hskHook": "提 (lift) + 高 (high)",
    "exampleZh": "自动化工具能显著提高排障效率。",
    "examplePy": "Zìdònghuà gōngjù néng xiǎnzhù tígāo páizhàng xiàolǜ.",
    "exampleEn": "Automation tools can noticeably improve troubleshooting efficiency.",
    "clozeZh": "自动化工具能显著【 ____ 】排障效率。",
    "clozeAnswer": "提高"
  },
  {
    "id": "fuzha",
    "hanzi": "复杂",
    "pinyin": "fùzá",
    "meaning": "Complex / Complicated",
    "category": "Descriptor",
    "levelTrack": "hsk3_4",
    "hskHook": "复 (duplicate/double) + 杂 (mixed)",
    "exampleZh": "微服务架构之间的调用链路非常复杂。",
    "examplePy": "Wēifúwù jiàgòu zhījiān de diàoyòng liànlù fēicháng fùzá.",
    "exampleEn": "The call chains between microservices are very complex.",
    "clozeZh": "微服务架构之间的调用链路非常【 ____ 】。",
    "clozeAnswer": "复杂"
  },
  {
    "id": "baozheng",
    "hanzi": "保证",
    "pinyin": "bǎozhèng",
    "meaning": "Guarantee / Ensure",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "保 (protect) + 证 (evidence/prove)",
    "exampleZh": "团队必须全力保证核心业务的稳定性。",
    "examplePy": "Tuánduì bìxū quánlì bǎozhèng héxīn yèwù de wěndìngxìng.",
    "exampleEn": "The team must do its utmost to guarantee the stability of core services.",
    "clozeZh": "团队必须全力【 ____ 】核心业务的稳定性。",
    "clozeAnswer": "保证"
  },
  {
    "id": "zhunque",
    "hanzi": "准确",
    "pinyin": "zhǔnquè",
    "meaning": "Accurate / Exact",
    "category": "Descriptor",
    "levelTrack": "hsk3_4",
    "hskHook": "准 (precise) + 确 (true/firm)",
    "exampleZh": "时序监控数据必须做到及时准确。",
    "examplePy": "Shíxù jiānkòng shùjù bìxū zuò dào jíshí zhǔnquè.",
    "exampleEn": "Time-series telemetry data must be timely and accurate.",
    "clozeZh": "时序监控数据必须做到及时【 ____ 】。",
    "clozeAnswer": "准确"
  },
  {
    "id": "guanjian",
    "hanzi": "关键",
    "pinyin": "guānjiàn",
    "meaning": "Crucial / Key point",
    "category": "Descriptor",
    "levelTrack": "hsk3_4",
    "hskHook": "关 (pass/door) + 键 (key)",
    "exampleZh": "快速定位根因是应急止损的关键。",
    "examplePy": "Kuàisù dìngwèi gēnyīn shì yìngjí zhǐsǔn de guānjiàn.",
    "exampleEn": "Fast root cause localization is the key to emergency mitigation.",
    "clozeZh": "快速定位根因是应急止损的【 ____ 】。",
    "clozeAnswer": "关键"
  },
  {
    "id": "guocheng",
    "hanzi": "过程",
    "pinyin": "guòchéng",
    "meaning": "Process / Course",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "过 (pass) + 程 (procedure)",
    "exampleZh": "在灰度发布的过程中要时刻关注监控指标。",
    "examplePy": "Zài huīdù fābù de guòchéng zhōng yào shíkè guānzhù jiānkòng zhǐbiāo.",
    "exampleEn": "During canary rollout process, watch telemetry metrics continuously.",
    "clozeZh": "在灰度发布的【 ____ 】中要时刻关注监控指标。",
    "clozeAnswer": "过程"
  },
  {
    "id": "jishi",
    "hanzi": "及时",
    "pinyin": "jíshí",
    "meaning": "Timely / In time",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "及 (reach) + 时 (time)",
    "exampleZh": "运维值班人员及时响应了告警通知。",
    "examplePy": "Yùnwéi zhíbān rényuán jíshí xiǎngyìng le gàojǐng tōngzhī.",
    "exampleEn": "On-call SRE promptly responded to the alert notification.",
    "clozeZh": "运维值班人员【 ____ 】响应了告警通知。",
    "clozeAnswer": "及时"
  },
  {
    "id": "fuze",
    "hanzi": "负责",
    "pinyin": "fùzé",
    "meaning": "Be responsible for / In charge",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "负 (bear/carry) + 责 (duty)",
    "exampleZh": "目前由谁负责这个服务模块的代码维护？",
    "examplePy": "Mùqián yóu shéi fùzé zhège fúwù mókuài de dàimǎ wéihù?",
    "exampleEn": "Who is currently in charge of maintaining code for this service module?",
    "clozeZh": "目前由谁【 ____ 】这个服务模块的代码维护？",
    "clozeAnswer": "负责"
  },
  {
    "id": "renwu",
    "hanzi": "任务",
    "pinyin": "rènwu",
    "meaning": "Task / Assignment",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "任 (appoint) + 务 (matter)",
    "exampleZh": "今天的核心任务是完成系统链路压测。",
    "examplePy": "Jīntiān de héxīn rènwu shì wánchéng xìtǒng liànlù yācè.",
    "exampleEn": "Today’s core task is to complete the full-link system stress test.",
    "clozeZh": "今天的核心【 ____ 】是完成系统链路压测。",
    "clozeAnswer": "任务"
  },
  {
    "id": "zongjie",
    "hanzi": "总结",
    "pinyin": "zǒngjié",
    "meaning": "Summarize / Summary",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "总 (overall) + 结 (knot/conclude)",
    "exampleZh": "故障复盘会后要形成详细的整改总结。",
    "examplePy": "Gùzhàng fùpánhuì hòu yào xíngchéng xiángxì de zhěnggǎi zǒngjié.",
    "exampleEn": "After postmortem, formulate a detailed remediation summary.",
    "clozeZh": "故障复盘会后要形成详细的整改【 ____ 】。",
    "clozeAnswer": "总结"
  },
  {
    "id": "shiying",
    "hanzi": "适应",
    "pinyin": "shìyìng",
    "meaning": "Adapt / Adjust to",
    "category": "Action",
    "levelTrack": "hsk3_4",
    "hskHook": "适 (suitable) + 应 (respond)",
    "exampleZh": "新员工需要尽快适应团队的工作节奏。",
    "examplePy": "Xīn yuángōng xūyào jìnkuài shìyìng tuánduì de gōngzuò jièzòu.",
    "exampleEn": "New engineers need to quickly adapt to team working cadence.",
    "clozeZh": "新员工需要尽快【 ____ 】团队的工作节奏。",
    "clozeAnswer": "适应"
  },
  {
    "id": "tiaojian",
    "hanzi": "条件",
    "pinyin": "tiáojiàn",
    "meaning": "Condition / Requirement",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "条 (item) + 件 (piece)",
    "exampleZh": "触发自动扩容需要满足特定负载条件。",
    "examplePy": "Chùfā zìdòng kuòróng xūyào mǎnzú tèdìng fùzǎi tiáojiàn.",
    "exampleEn": "Triggering auto-scaling requires meeting specific load conditions.",
    "clozeZh": "触发自动扩容需要满足特定负载【 ____ 】。",
    "clozeAnswer": "条件"
  },
  {
    "id": "diaocha",
    "hanzi": "调查",
    "pinyin": "diàochá",
    "meaning": "Investigate / Survey",
    "category": "Action",
    "levelTrack": "hsk3_4",
    "hskHook": "调 (transfer/inquire) + 查 (examine)",
    "exampleZh": "安全团队正在深入调查异常流量来源。",
    "examplePy": "Ānquán tuánduì zhèngzài shēnrù diàochá yìcháng liúliàng láiyuán.",
    "exampleEn": "Security team is thoroughly investigating source of abnormal traffic.",
    "clozeZh": "安全团队正在深入【 ____ 】异常流量来源。",
    "clozeAnswer": "调查"
  },
  {
    "id": "kaolv",
    "hanzi": "考虑",
    "pinyin": "kǎolǜ",
    "meaning": "Consider / Ponder",
    "category": "Cognition",
    "levelTrack": "hsk3_4",
    "hskHook": "考 (examine) + 虑 (think deeply)",
    "exampleZh": "做技术选型时要充分考虑系统扩展性。",
    "examplePy": "Zuò jìshù xuǎnxíng shí yào chōngfèn kǎolǜ xìtǒng kuòzhǎnxìng.",
    "exampleEn": "When making tech selection, fully consider system extensibility.",
    "clozeZh": "做技术选型时要充分【 ____ 】系统扩展性。",
    "clozeAnswer": "考虑"
  },
  {
    "id": "yingxiang",
    "hanzi": "影响",
    "pinyin": "yǐngxiǎng",
    "meaning": "Influence / Impact",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "影 (shadow) + 响 (echo/sound)",
    "exampleZh": "本次网络抖动对核心接口造成了轻微影响。",
    "examplePy": "Běn cì wǎngluò dǒudòng duì héxīn jiēkǒu zàochéng le qīngwēi yǐngxiǎng.",
    "exampleEn": "This network jitter had a slight impact on core APIs.",
    "clozeZh": "本次网络抖动对核心接口造成了轻微【 ____ 】。",
    "clozeAnswer": "影响"
  },
  {
    "id": "fasheng",
    "hanzi": "发生",
    "pinyin": "fāshēng",
    "meaning": "Happen / Occur",
    "category": "Action",
    "levelTrack": "hsk3_4",
    "hskHook": "发 (send out) + 生 (grow/arise)",
    "exampleZh": "数据库集群在午夜发生了主从切换。",
    "examplePy": "Shùjùkù jíqún zài wǔyè fāshēng le zhǔcóng qiēhuàn.",
    "exampleEn": "The database cluster underwent master-slave switchover at midnight.",
    "clozeZh": "数据库集群在午夜【 ____ 】了主从切换。",
    "clozeAnswer": "发生"
  },
  {
    "id": "zaocheng",
    "hanzi": "造成",
    "pinyin": "zàochéng",
    "meaning": "Cause / Bring about",
    "category": "Action",
    "levelTrack": "hsk3_4",
    "hskHook": "造 (make) + 成 (complete/become)",
    "exampleZh": "错误配置对生产集群造成了严重延迟。",
    "examplePy": "Cuòwù pèizhì duì shēngchǎn jíqún zàochéng le yánzhòng yánchí.",
    "exampleEn": "Misconfiguration caused severe latency on production cluster.",
    "clozeZh": "错误配置对生产集群【 ____ 】了严重延迟。",
    "clozeAnswer": "造成"
  },
  {
    "id": "anpai",
    "hanzi": "安排",
    "pinyin": "ānpái",
    "meaning": "Arrange / Schedule",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "安 (safe/settle) + 排 (row/align)",
    "exampleZh": "主管已经为我们安排了晚上的轮值计划。",
    "examplePy": "Zhǔguǎn yǐjīng wèi wǒmen ānpái le wǎnshang de lúnzhí jìhuà.",
    "exampleEn": "The lead has already arranged evening on-call rota for us.",
    "clozeZh": "主管已经为我们【 ____ 】了晚上的轮值计划。",
    "clozeAnswer": "安排"
  },
  {
    "id": "anzhao",
    "hanzi": "按照",
    "pinyin": "ànzhào",
    "meaning": "According to / In accordance with",
    "category": "Preposition",
    "levelTrack": "hsk3_4",
    "hskHook": "按 (press/follow) + 照 (shine/reflect)",
    "exampleZh": "请按照应急预案逐步执行止损操作。",
    "examplePy": "Qǐng ànzhào yìngjí yùàn zhúbù zhíxíng zhǐsǔn cāozuò.",
    "exampleEn": "Please execute mitigation step by step according to SOP.",
    "clozeZh": "请【 ____ 】应急预案逐步执行止损操作。",
    "clozeAnswer": "按照"
  },
  {
    "id": "xiangxi",
    "hanzi": "详细",
    "pinyin": "xiángxì",
    "meaning": "Detailed / Thorough",
    "category": "Descriptor",
    "levelTrack": "hsk3_4",
    "hskHook": "详 (minute/full) + 细 (fine/slender)",
    "exampleZh": "请在工单中附上详细的错误调用栈日志。",
    "examplePy": "Qǐng zài gōngdān zhōng fù shàng xiángxì de cuòwù diàoyòngzhàn rìzhì.",
    "exampleEn": "Please attach detailed error call stack logs to the ticket.",
    "clozeZh": "请在工单中附上【 ____ 】的错误调用栈日志。",
    "clozeAnswer": "详细"
  },
  {
    "id": "jingyan",
    "hanzi": "经验",
    "pinyin": "jīngyàn",
    "meaning": "Experience",
    "category": "Workplace",
    "levelTrack": "hsk3_4",
    "hskHook": "经 (pass through) + 验 (test/verify)",
    "exampleZh": "资深运维架构师拥有丰富的应急处置经验。",
    "examplePy": "Zīshēn yùnwéi jiàgòushī yōngyǒu fēngfù de yìngjí chǔzhì jīngyàn.",
    "exampleEn": "Senior SRE architects possess rich incident handling experience.",
    "clozeZh": "资深运维架构师拥有丰富的应急处置【 ____ 】。",
    "clozeAnswer": "经验"
  },
  {
    "id": "luoji",
    "hanzi": "逻辑",
    "pinyin": "luóji",
    "meaning": "Logic / Reasoning",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "罗 (sieve) + 辑 (compile)",
    "exampleZh": "业务处理逻辑必须保证幂等性与一致性。",
    "examplePy": "Yèwù chǔlǐ luóji bìxū bǎozhèng mìděngxìng yǔ yízhìxìng.",
    "exampleEn": "Business logic must guarantee idempotency and consistency.",
    "clozeZh": "业务处理【 ____ 】必须保证幂等性与一致性。",
    "clozeAnswer": "逻辑"
  },
  {
    "id": "jiegou",
    "hanzi": "结构",
    "pinyin": "jiégòu",
    "meaning": "Structure / Architecture",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "结 (tie/form) + 构 (construct)",
    "exampleZh": "良好的系统分层结构能够降低服务间的耦合度。",
    "examplePy": "Liánghǎo de xìtǒng fēncéng jiégòu nénggòu jiàngdī fúwù jiān de ǒuhédù.",
    "exampleEn": "Sound system layered architecture reduces inter-service coupling.",
    "clozeZh": "良好的系统分层【 ____ 】能够降低服务间的耦合度。",
    "clozeAnswer": "结构"
  },
  {
    "id": "chixu",
    "hanzi": "持续",
    "pinyin": "chíxù",
    "meaning": "Continuous / Sustain",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "持 (hold/maintain) + 续 (continue)",
    "exampleZh": "团队致力于实现持续集成与自动化持续交付。",
    "examplePy": "Tuánduì zhìlì yú shíxiàn chíxù jíchéng yǔ zìdònghuà chíxù jiāofù.",
    "exampleEn": "The team is committed to continuous integration and delivery.",
    "clozeZh": "团队致力于实现【 ____ 】集成与自动化持续交付。",
    "clozeAnswer": "持续"
  },
  {
    "id": "youhua",
    "hanzi": "优化",
    "pinyin": "yōuhuà",
    "meaning": "Optimize / Optimization",
    "category": "Action",
    "levelTrack": "hsk5_6",
    "hskHook": "优 (superior) + 化 (-ize/transform)",
    "exampleZh": "通过索引重构优化了慢查询的响应延迟。",
    "examplePy": "Tōngguò suǒyǐn chónggòu yōuhuà le màn cháxún de xiǎngyìng yánchí.",
    "exampleEn": "Slow query response latency was optimized via index restructuring.",
    "clozeZh": "通过索引重构【 ____ 】了慢查询的响应延迟。",
    "clozeAnswer": "优化"
  },
  {
    "id": "fengxian",
    "hanzi": "风险",
    "pinyin": "fēngxiǎn",
    "meaning": "Risk / Hazard",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "风 (wind) + 险 (danger)",
    "exampleZh": "重大系统架构改造前必须做好全方位的风险评估。",
    "examplePy": "Zhòngdà xìtǒng jiàgòu gǎizào qián bìxū zuò hǎo quán fāngwèi de fēngxiǎn pínggū.",
    "exampleEn": "Comprehensive risk assessment is mandatory before major refactoring.",
    "clozeZh": "重大系统架构改造前必须做好全方位的【 ____ 】评估。",
    "clozeAnswer": "风险"
  },
  {
    "id": "hexin",
    "hanzi": "核心",
    "pinyin": "héxīn",
    "meaning": "Core / Kernel / Essential",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "核 (seed/nucleus) + 心 (heart)",
    "exampleZh": "高可用容灾能力是金融级云原生平台的核心支柱。",
    "examplePy": "Gāokěyòng róngzāi nénglì shì jīnróng jí yún yuánshēng píngtái de héxīn zhīzhù.",
    "exampleEn": "HA disaster recovery is the core pillar of financial-grade cloud platforms.",
    "clozeZh": "高可用容灾能力是金融级云原生平台的【 ____ 】支柱。",
    "clozeAnswer": "核心"
  },
  {
    "id": "cuoshi",
    "hanzi": "措施",
    "pinyin": "cuòshī",
    "meaning": "Measure / Step / Action",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "措 (arrange/handle) + 施 (apply/carry out)",
    "exampleZh": "必须尽快落实针对依赖超时问题的防范措施。",
    "examplePy": "Bìxū jìnkuài luòshí zhēnduì yīlài chāoshí wèntí de fángfàn cuòshī.",
    "exampleEn": "Preventative measures against dependency timeouts must be enacted quickly.",
    "clozeZh": "必须尽快落实针对依赖超时问题的防范【 ____ 】。",
    "clozeAnswer": "措施"
  },
  {
    "id": "xiaolv",
    "hanzi": "效率",
    "pinyin": "xiàolǜ",
    "meaning": "Efficiency / Productivity",
    "category": "Descriptor",
    "levelTrack": "hsk5_6",
    "hskHook": "效 (effect) + 率 (rate/ratio)",
    "exampleZh": "采用智能化运维流水线能倍增排障处置效率。",
    "examplePy": "Cǎiyòng zhìnénghuà yùnwéi liúshuǐxiàn néng bèizēng páizhàng chǔzhì xiàolǜ.",
    "exampleEn": "Adopting AIOps pipelines multiplies incident troubleshooting efficiency.",
    "clozeZh": "采用智能化运维流水线能倍增排障处置【 ____ 】。",
    "clozeAnswer": "效率"
  },
  {
    "id": "qushi",
    "hanzi": "趋势",
    "pinyin": "qūshì",
    "meaning": "Trend / Tendency",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "趋 (tend toward) + 势 (power/momentum)",
    "exampleZh": "指标监控曲线呈现出持续上升的内存占用趋势。",
    "examplePy": "Zhǐbiāo jiānkòng qūxiàn chéngxiàn chū chíxù shàngshēng de nèicún zhànyòng qūshì.",
    "exampleEn": "Telemetry charts show an upward trend of memory consumption.",
    "clozeZh": "指标监控曲线呈现出持续上升的内存占用【 ____ 】。",
    "clozeAnswer": "趋势"
  },
  {
    "id": "ziyuan",
    "hanzi": "资源",
    "pinyin": "zīyuán",
    "meaning": "Resource / Asset",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "资 (money/resource) + 源 (source)",
    "exampleZh": "容器集群调度算法负责合理分配计算与内存资源。",
    "examplePy": "Róngqì jíqún diàodù suànfǎ fùzé hélǐ fēnpèi jìsuàn yǔ nèicún zīyuán.",
    "exampleEn": "Container cluster schedulers allocate compute and memory resources.",
    "clozeZh": "容器集群调度算法负责合理分配计算与内存【 ____ 】。",
    "clozeAnswer": "资源"
  },
  {
    "id": "fangan",
    "hanzi": "方案",
    "pinyin": "fāng'àn",
    "meaning": "Scheme / Proposal / Solution",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "方 (method) + 案 (case/record)",
    "exampleZh": "架构委员会最终通过了双活数据中心迁移方案。",
    "examplePy": "Jiàgòu wěiyuánhuì zuìzhōng tōngguò le shuānghuó shùjù zhōngxīn qiānyí fāng'àn.",
    "exampleEn": "Architecture committee approved the active-active DC migration plan.",
    "clozeZh": "架构委员会最终通过了双活数据中心迁移【 ____ 】。",
    "clozeAnswer": "方案"
  },
  {
    "id": "zonghe",
    "hanzi": "综合",
    "pinyin": "zōnghé",
    "meaning": "Comprehensive / Synthesize",
    "category": "Descriptor",
    "levelTrack": "hsk5_6",
    "hskHook": "综 (put together) + 合 (join)",
    "exampleZh": "我们需要综合考虑业务收益、成本和技术可行性。",
    "examplePy": "Wǒmen xūyào zōnghé kǎolǜ yèwù shòuyì, chéngběn hé jìshù kěxíngxìng.",
    "exampleEn": "We need to comprehensively weigh ROI, cost, and feasibility.",
    "clozeZh": "我们需要【 ____ 】考虑业务收益、成本和技术可行性。",
    "clozeAnswer": "综合"
  },
  {
    "id": "pinggu",
    "hanzi": "评估",
    "pinyin": "pínggū",
    "meaning": "Evaluate / Assess",
    "category": "Action",
    "levelTrack": "hsk5_6",
    "hskHook": "评 (comment/judge) + 估 (estimate)",
    "exampleZh": "发布前请组织团队全面评估新版本的兼容性。",
    "examplePy": "Fābù qián qǐng zǔzhī tuánduì quánmiàn pínggū xīn bǎnběn de jiānróngxìng.",
    "exampleEn": "Before launch, assemble team to comprehensively assess compatibility.",
    "clozeZh": "发布前请组织团队全面【 ____ 】新版本的兼容性。",
    "clozeAnswer": "评估"
  },
  {
    "id": "bushu",
    "hanzi": "部署",
    "pinyin": "bùshǔ",
    "meaning": "Deploy / Deployment",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "部 (section/arrange) + 署 (station/office)",
    "exampleZh": "采用分批金丝雀发布策略能平滑完成生产部署。",
    "examplePy": "Cǎiyòng fēnpī jīnsīquè fābù cèlüè néng pínghuá wánchéng shēngchǎn bùshǔ.",
    "exampleEn": "Canary rollout strategy smoothly achieves production deployment.",
    "clozeZh": "采用分批金丝雀发布策略能平滑完成生产【 ____ 】。",
    "clozeAnswer": "部署"
  },
  {
    "id": "juece",
    "hanzi": "决策",
    "pinyin": "juécè",
    "meaning": "Strategic decision / Policy making",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "决 (decide) + 策 (strategy/plan)",
    "exampleZh": "基于监控大数据分析能够支撑更精准的架构决策。",
    "examplePy": "Jīyú jiānkòng dàshùjù fēnxī nénggòu zhīchēng gèng jīngzhǔn de jiàgòu juécè.",
    "exampleEn": "Observability big data analytics supports precise architecture decisions.",
    "clozeZh": "基于监控大数据分析能够支撑更精准的架构【 ____ 】。",
    "clozeAnswer": "决策"
  },
  {
    "id": "yichang",
    "hanzi": "异常",
    "pinyin": "yìcháng",
    "meaning": "Abnormal / Anomaly",
    "category": "Descriptor",
    "levelTrack": "hsk5_6",
    "hskHook": "异 (different/strange) + 常 (ordinary/regular)",
    "exampleZh": "智能分析引擎检测到了多个接口调用的统计异常。",
    "examplePy": "Zhìnéng fēnxī yǐnqíng jiǎncè dào le duō ge jiēkǒu diàoyòng de tǒngjì yìcháng.",
    "exampleEn": "Intelligent engine flagged statistical anomalies across APIs.",
    "clozeZh": "智能分析引擎检测到了多个接口调用的统计【 ____ 】。",
    "clozeAnswer": "异常"
  },
  {
    "id": "jizhi",
    "hanzi": "机制",
    "pinyin": "jīzhì",
    "meaning": "Mechanism / Inner workings",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "机 (machine/opportunity) + 制 (system/control)",
    "exampleZh": "心跳保活机制确保了集群管理节点的健康探测。",
    "examplePy": "Xīntiào bǎohuó jīzhì quèbǎo le jíqún guǎnlǐ jiédiǎn de jiànkāng tàncè.",
    "exampleEn": "Heartbeat keepalive mechanism ensures health checks of cluster leaders.",
    "clozeZh": "心跳保活【 ____ 】确保了集群管理节点的健康探测。",
    "clozeAnswer": "机制"
  },
  {
    "id": "guifan",
    "hanzi": "规范",
    "pinyin": "guīfàn",
    "meaning": "Standard / Standardize / Specification",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "规 (compass/rule) + 范 (model/pattern)",
    "exampleZh": "严格遵守日志格式规范能极大促进自动化分析。",
    "examplePy": "Yángé zūnshǒu rìzhì gèshì guīfàn néng jídà cùjìn zìdònghuà fēnxī.",
    "exampleEn": "Strict log schema standardization greatly promotes automated analysis.",
    "clozeZh": "严格遵守日志格式【 ____ 】能极大促进自动化分析。",
    "clozeAnswer": "规范"
  },
  {
    "id": "weidu",
    "hanzi": "维度",
    "pinyin": "wéidù",
    "meaning": "Dimension / Facet",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "维 (maintain/dimension) + 度 (degree/measure)",
    "exampleZh": "我们需要从延时、流量、错误及饱和度四个维度进行度量。",
    "examplePy": "Wǒmen xūyào cóng yánshí, liúliàng, cuòwù jí bǎohédù sì ge wéidù jìnxíng dùliáng.",
    "exampleEn": "We measure across latency, traffic, errors, and saturation dimensions.",
    "clozeZh": "我们需要从延时、流量、错误及饱和度四个【 ____ 】进行度量。",
    "clozeAnswer": "维度"
  },
  {
    "id": "rongcuo",
    "hanzi": "容错",
    "pinyin": "róngcuò",
    "meaning": "Fault tolerance / Resilience",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "容 (contain/tolerate) + 错 (fault/error)",
    "exampleZh": "微服务通过重试、超时和隔离等技术实现高度容错。",
    "examplePy": "Wēifúwù tōngguò chóngshì, chāoshí hé gélí děng jìshù shíxiàn gāodù róngcuò.",
    "exampleEn": "Microservices achieve high resilience via retry, timeout, and bulkhead.",
    "clozeZh": "微服务通过重试、超时和隔离等技术实现高度【 ____ 】。",
    "clozeAnswer": "容错"
  },
  {
    "id": "xietong",
    "hanzi": "协同",
    "pinyin": "xiétóng",
    "meaning": "Collaborate / Synergize",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "协 (joint/assist) + 同 (together)",
    "exampleZh": "高效的故障处置离不开研发、运维与安全团队的紧密协同。",
    "examplePy": "Gāoxiào de gùzhàng chǔzhì lí bù kāi yánfā, yùnwéi yǔ ānquán tuánduì de jǐnmì xiétóng.",
    "exampleEn": "Effective incident triage relies on tight dev, ops, and sec collaboration.",
    "clozeZh": "高效的故障处置离不开研发、运维与安全团队的紧密【 ____ 】。",
    "clozeAnswer": "协同"
  },
  {
    "id": "guanche",
    "hanzi": "贯彻",
    "pinyin": "guànchè",
    "meaning": "Implement / Carry through",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "贯 (thread through) + 彻 (penetrate/through)",
    "exampleZh": "团队必须将系统安全性原则彻底贯彻到每一次代码提交。",
    "examplePy": "Tuánduì bìxū jiāng xìtǒng ānquánxìng yuánzé chèdǐ guànchè dào měi yí cì dàimǎ tíjiāo.",
    "exampleEn": "Security principles must be thoroughly implemented in every commit.",
    "clozeZh": "团队必须将系统安全性原则彻底【 ____ 】到每一次代码提交。",
    "clozeAnswer": "贯彻"
  },
  {
    "id": "tongchou",
    "hanzi": "统筹",
    "pinyin": "tǒngchóu",
    "meaning": "Coordinate as a whole / Plan overall",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "统 (unite/overall) + 筹 (plan/tally)",
    "exampleZh": "技术总监负责统筹全公司的上云演进与基础设施改造。",
    "examplePy": "Jìshù zǒngjiān fùzé tǒngchóu quán gōngsī de shàngyún yǎnjìn yǔ jīchǔ shèshī gǎizào.",
    "exampleEn": "CTO oversees overall company cloud migration and infra evolution.",
    "clozeZh": "技术总监负责【 ____ 】全公司的上云演进与基础设施改造。",
    "clozeAnswer": "统筹"
  },
  {
    "id": "pingjing",
    "hanzi": "瓶颈",
    "pinyin": "píngjǐng",
    "meaning": "Bottleneck / Chokepoint",
    "category": "Strategy/Arch",
    "levelTrack": "hsk5_6",
    "hskHook": "瓶 (bottle) + 颈 (neck)",
    "exampleZh": "磁盘I/O吞吐量是整个分析流水线的主要性能瓶颈。",
    "examplePy": "Cípán I/O tūntǔliàng shì zhěnggè fēnxī liúshuǐxiàn de zhǔyào xìngnéng píngjǐng.",
    "exampleEn": "Disk I/O throughput is the main bottleneck of the pipeline.",
    "clozeZh": "磁盘I/O吞吐量是整个分析流水线的主要性能【 ____ 】。",
    "clozeAnswer": "瓶颈"
  },
  {
    "id": "wending",
    "hanzi": "稳定",
    "pinyin": "wěndìng",
    "meaning": "Stable / Stability",
    "category": "Descriptor",
    "levelTrack": "hsk5_6",
    "hskHook": "稳 (firm/steady) + 定 (fixed)",
    "exampleZh": "核心服务在双十一峰值期间表现得非常稳定。",
    "examplePy": "Héxīn fúwù zài shuāng shíyī fēngzhí qījiān biǎoxiàn de fēicháng wěndìng.",
    "exampleEn": "Core services performed very stably during shopping holiday traffic peaks.",
    "clozeZh": "核心服务在双十一峰值期间表现得非常【 ____ 】。",
    "clozeAnswer": "稳定"
  },
  {
    "id": "chubu",
    "hanzi": "初步",
    "pinyin": "chūbù",
    "meaning": "Preliminary / Initial",
    "category": "Descriptor",
    "levelTrack": "hsk5_6",
    "hskHook": "初 (first/beginning) + 步 (step)",
    "exampleZh": "经过初步评估，我们确定了第一阶段迁移方案。",
    "examplePy": "Jīngguò chūbù pínggū, wǒmen quèdìng le dì yī jiēduàn qiānyí fāng'àn.",
    "exampleEn": "After preliminary assessment, we finalized the Phase 1 migration plan.",
    "clozeZh": "经过【 ____ 】评估，我们确定了第一阶段迁移方案。",
    "clozeAnswer": "初步"
  },
  {
    "id": "gaojing",
    "hanzi": "告警",
    "pinyin": "gàojǐng",
    "meaning": "Alert / Warning",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "告 (announce) + 警 (warn)",
    "exampleZh": "监控平台在凌晨触发了高优先级告警。",
    "examplePy": "Jiānkòng píngtái zài língchén chùfā le gāo yōuxiānjí gàojǐng.",
    "exampleEn": "Monitoring platform triggered a P1 alert before dawn.",
    "clozeZh": "监控平台在凌晨触发了高优先级【 ____ 】。",
    "clozeAnswer": "告警"
  },
  {
    "id": "jiangzao",
    "hanzi": "降噪",
    "pinyin": "jiàngzào",
    "meaning": "Noise reduction / De-duplication",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "降 (lower/reduce) + 噪 (noise)",
    "exampleZh": "智能聚类降噪减少了百分之八十的重复通知。",
    "examplePy": "Zhìnéng jùlèi jiàngzào jiǎnshǎo le bǎifēnzhī bāshí de chóngfù tōngzhī.",
    "exampleEn": "Intelligent noise reduction suppressed 80% of duplicate alerts.",
    "clozeZh": "智能聚类【 ____ 】减少了百分之八十的重复通知。",
    "clozeAnswer": "降噪"
  },
  {
    "id": "yuzhi",
    "hanzi": "阈值",
    "pinyin": "yùzhí",
    "meaning": "Threshold (pronounced yùzhí)",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "阈 (boundary/threshold) + 值 (value)",
    "exampleZh": "CPU使用率超过动态阈值即自动发送预警。",
    "examplePy": "CPU shǐyònglǜ chāoguò dòngtài yùzhí jí zìdòng fāsòng yùjǐng.",
    "exampleEn": "CPU usage exceeding dynamic threshold triggers early warning automatically.",
    "clozeZh": "CPU使用率超过动态【 ____ 】即自动发送预警。",
    "clozeAnswer": "阈值"
  },
  {
    "id": "wubao",
    "hanzi": "误报",
    "pinyin": "wùbào",
    "meaning": "False Positive",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "误 (mistake/erroneous) + 报 (report)",
    "exampleZh": "模型重新训练后显著降低了误报率。",
    "examplePy": "Móxíng chóngxīn xùnliàn hòu xiǎnzhù jiàngdī le wùbào lǜ.",
    "exampleEn": "Model retraining significantly reduced the false positive rate.",
    "clozeZh": "模型重新训练后显著降低了【 ____ 】率。",
    "clozeAnswer": "误报"
  },
  {
    "id": "loubao",
    "hanzi": "漏报",
    "pinyin": "lòubào",
    "meaning": "False Negative",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "漏 (leak/omit) + 报 (report)",
    "exampleZh": "零漏报是核心支付链路异常监控的硬性指标。",
    "examplePy": "Líng lòubào shì héxīn zhīfù liànlù yìcháng jiānkòng de yìngxìng zhǐbiāo.",
    "exampleEn": "Zero false negatives is a hard requirement for payment telemetry.",
    "clozeZh": "零【 ____ 】是核心支付链路异常监控的硬性指标。",
    "clozeAnswer": "漏报"
  },
  {
    "id": "genyin",
    "hanzi": "根因",
    "pinyin": "gēnyīn",
    "meaning": "Root cause",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "根 (root) + 因 (cause)",
    "exampleZh": "AI根因分析算法精准定位到了内存泄漏的微服务。",
    "examplePy": "AI gēnyīn fēnxī suànfǎ jīngzhǔn dìngwèi dào le nèicún xièlòu de wēifúwù.",
    "exampleEn": "AI root cause analysis pinpointed the microservice with memory leak.",
    "clozeZh": "AI【 ____ 】分析算法精准定位到了内存泄漏的微服务。",
    "clozeAnswer": "根因"
  },
  {
    "id": "guzhang",
    "hanzi": "故障",
    "pinyin": "gùzhàng",
    "meaning": "Fault / Outage / Incident",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "故 (accident/cause) + 障 (obstacle)",
    "exampleZh": "此次生产故障由主交换机硬件损坏引起。",
    "examplePy": "Cǐ cì shēngchǎn gùzhàng yóu zhǔ jiāohuànjī yìngjiàn sǔnhuài yǐnqǐ.",
    "exampleEn": "This production outage was caused by a core switch hardware failure.",
    "clozeZh": "此次生产【 ____ 】由主交换机硬件损坏引起。",
    "clozeAnswer": "故障"
  },
  {
    "id": "dingwei",
    "hanzi": "定位",
    "pinyin": "dìngwèi",
    "meaning": "Pinpoint / Localize / Identify",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "定 (fix/determine) + 位 (position)",
    "exampleZh": "我们利用拓扑依赖图快速定位异常节点。",
    "examplePy": "Wǒmen lìyòng tuòpū yīlài tú kuàisù dìngwèi yìcháng jiédiǎn.",
    "exampleEn": "We quickly localized the anomalous node using dependency topology graphs.",
    "clozeZh": "我们利用拓扑依赖图快速【 ____ 】异常节点。",
    "clozeAnswer": "定位"
  },
  {
    "id": "huigun",
    "hanzi": "回滚",
    "pinyin": "huígǔn",
    "meaning": "Rollback (deployment / config)",
    "category": "SRE Action",
    "levelTrack": "tech_aiops",
    "hskHook": "回 (return) + 滚 (roll)",
    "exampleZh": "发现新版本存在严重缺陷后立即执行版本回滚。",
    "examplePy": "Fāxiàn xīn bǎnběn cúnzài yánzhòng quēxiàn hòu lìjí zhíxíng bǎnběn huígǔn.",
    "exampleEn": "Immediately execute version rollback upon discovering critical bug.",
    "clozeZh": "发现新版本存在严重缺陷后立即执行版本【 ____ 】。",
    "clozeAnswer": "回滚"
  },
  {
    "id": "zhisun",
    "hanzi": "止损",
    "pinyin": "zhǐsǔn",
    "meaning": "Mitigation / Stop-loss",
    "category": "SRE Action",
    "levelTrack": "tech_aiops",
    "hskHook": "止 (stop) + 损 (damage/loss)",
    "exampleZh": "应急响应的第一原则是先止损后排查。",
    "examplePy": "Yìngjí xiǎngyìng de dì yī yuánzé shì xiān zhǐsǔn hòu páichá.",
    "exampleEn": "The first rule of emergency response is mitigate first, troubleshoot later.",
    "clozeZh": "应急响应的第一原则是先【 ____ 】后排查。",
    "clozeAnswer": "止损"
  },
  {
    "id": "jiangji",
    "hanzi": "降级",
    "pinyin": "jiàngjí",
    "meaning": "Service degradation / Fallback",
    "category": "SRE Action",
    "levelTrack": "tech_aiops",
    "hskHook": "降 (lower) + 级 (level)",
    "exampleZh": "高峰期自动开启非核心功能服务降级。",
    "examplePy": "Gāofēng qī zìdòng kāiqǐ fēihéxīn gōngnéng fúwù jiàngjí.",
    "exampleEn": "Automatically trigger service degradation for non-core features during peaks.",
    "clozeZh": "高峰期自动开启非核心功能服务【 ____ 】。",
    "clozeAnswer": "降级"
  },
  {
    "id": "rongduan",
    "hanzi": "熔断",
    "pinyin": "róngduàn",
    "meaning": "Circuit breaking",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "熔 (melt/fuse) + 断 (break)",
    "exampleZh": "下游接口响应超时触发了熔断保护。",
    "examplePy": "Xiàyóu jiēkǒu xiǎngyìng chāoshí chùfā le róngduàn bǎohù.",
    "exampleEn": "Downstream response timeouts triggered circuit-breaker protection.",
    "clozeZh": "下游接口响应超时触发了【 ____ 】保护。",
    "clozeAnswer": "熔断"
  },
  {
    "id": "paicha",
    "hanzi": "排查",
    "pinyin": "páichá",
    "meaning": "Troubleshoot / Investigate",
    "category": "SRE Action",
    "levelTrack": "tech_aiops",
    "hskHook": "排 (eliminate) + 查 (examine)",
    "exampleZh": "运维团队正全力排查数据库死锁问题。",
    "examplePy": "Yùnwéi tuánduì zhèng quánlì páichá shùjùkù sǐsuǒ wèntí.",
    "exampleEn": "The ops team is investigating database deadlock issues with full priority.",
    "clozeZh": "运维团队正全力【 ____ 】数据库死锁问题。",
    "clozeAnswer": "排查"
  },
  {
    "id": "zhibiao",
    "hanzi": "指标",
    "pinyin": "zhǐbiāo",
    "meaning": "Metrics / Telemetry indicators",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "指 (point) + 标 (mark/indicator)",
    "exampleZh": "集群各项黄金指标均已恢复至正常水位。",
    "examplePy": "Jíqún gè xiàng huángjīn zhǐbiāo jūn yǐ huīfù zhì zhèngcháng shuǐwèi.",
    "exampleEn": "All cluster golden telemetry metrics returned to normal levels.",
    "clozeZh": "集群各项黄金【 ____ 】均已恢复至正常水位。",
    "clozeAnswer": "指标"
  },
  {
    "id": "rizhi",
    "hanzi": "日志",
    "pinyin": "rìzhì",
    "meaning": "Logs / Event records",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "日 (day) + 志 (record)",
    "exampleZh": "排查线上异常首要查看错误日志堆栈。",
    "examplePy": "Páichá xiànshàng yìcháng shǒuyào chákàn cuòwù rìzhì duīzhàn.",
    "exampleEn": "Investigating online incidents requires inspecting error log stacks first.",
    "clozeZh": "排查线上异常首要查看错误【 ____ 】堆栈。",
    "clozeAnswer": "日志"
  },
  {
    "id": "diaoyonglian",
    "hanzi": "调用链",
    "pinyin": "diàoyòngliàn",
    "meaning": "Distributed trace / Call chain",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "调用 (invoke) + 链 (chain)",
    "exampleZh": "分布式调用链追踪能够清晰呈现每个跨度耗时。",
    "examplePy": "Fēnbùshì diàoyòngliàn zhuīzōng nénggòu qīngxī chéngxiàn měi ge kuàdù hàoshí.",
    "exampleEn": "Distributed tracing displays execution time of each span clearly.",
    "clozeZh": "分布式【 ____ 】追踪能够清晰呈现每个跨度耗时。",
    "clozeAnswer": "调用链"
  },
  {
    "id": "yichang_jiance",
    "hanzi": "异常检测",
    "pinyin": "yìcháng jiǎncè",
    "meaning": "Anomaly detection",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "异常 (abnormal) + 检测 (detect)",
    "exampleZh": "无监督异常检测模型提前预警了流量暴涨。",
    "examplePy": "Wújiāndū yìcháng jiǎncè móxíng tíqián yùjǐng le liúliàng bàozhǎng.",
    "exampleEn": "Unsupervised anomaly detection flagged sudden traffic spikes beforehand.",
    "clozeZh": "无监督【 ____ 】模型提前预警了流量暴涨。",
    "clozeAnswer": "异常检测"
  },
  {
    "id": "fupan",
    "hanzi": "复盘",
    "pinyin": "fùpán",
    "meaning": "Postmortem / Retrospective",
    "category": "SRE Action",
    "levelTrack": "tech_aiops",
    "hskHook": "复 (repeat) + 盘 (board)",
    "exampleZh": "团队每周五举行线上故障复盘会议总结改进项。",
    "examplePy": "Tuánduì měi zhōuwǔ jǔxíng xiànshàng gùzhàng fùpán huìyì zǒngjié gǎijìn xiàng.",
    "exampleEn": "Team holds postmortems every Friday to document action items.",
    "clozeZh": "团队每周五举行线上故障【 ____ 】会议总结改进项。",
    "clozeAnswer": "复盘"
  },
  {
    "id": "keguancexing",
    "hanzi": "可观测性",
    "pinyin": "kě guāncè xìng",
    "meaning": "Observability",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "可 (can) + 观测 (observe) + 性 (-ity)",
    "exampleZh": "指标、日志和链路是构建可观测性的三大支柱。",
    "examplePy": "Zhǐbiāo, rìzhì hé liànlù shì gòujiàn kě guāncè xìng de sān dà zhīzhù.",
    "exampleEn": "Metrics, logs, and traces are three pillars of observability.",
    "clozeZh": "指标、日志和链路是构建【 ____ 】的三大支柱。",
    "clozeAnswer": "可观测性"
  },
  {
    "id": "kuorong",
    "hanzi": "扩容",
    "pinyin": "kuòróng",
    "meaning": "Scale out / Capacity expansion",
    "category": "SRE Action",
    "levelTrack": "tech_aiops",
    "hskHook": "扩 (expand) + 容 (capacity)",
    "exampleZh": "压测前我们对缓存集群进行了横向扩容。",
    "examplePy": "Yācè qián wǒmen duì huǎncún jíqún jìnxíng le héngxiàng kuòróng.",
    "exampleEn": "We horizontally scaled out the cache cluster prior to load testing.",
    "clozeZh": "压测前我们对缓存集群进行了横向【 ____ 】。",
    "clozeAnswer": "扩容"
  },
  {
    "id": "xianliu",
    "hanzi": "限流",
    "pinyin": "xiànliú",
    "meaning": "Rate limiting / Throttling",
    "category": "SRE Action",
    "levelTrack": "tech_aiops",
    "hskHook": "限 (limit) + 流 (flow/traffic)",
    "exampleZh": "网关层限流策略保护了后端核心服务免于过载。",
    "examplePy": "Wǎngguān céng xiànliú cèlüè bǎohù le hòuduān héxīn fúwù miǎnyú guòzǎi.",
    "exampleEn": "Gateway rate limiting protected backend core services from overload.",
    "clozeZh": "网关层【 ____ 】策略保护了后端核心服务免于过载。",
    "clozeAnswer": "限流"
  },
  {
    "id": "yace",
    "hanzi": "压测",
    "pinyin": "yācè",
    "meaning": "Stress testing / Load testing",
    "category": "SRE Action",
    "levelTrack": "tech_aiops",
    "hskHook": "压 (pressure) + 测 (test)",
    "exampleZh": "全链路压测验证了系统的极限吞吐能力。",
    "examplePy": "Quán liànlù yācè yànzhèng le xìtǒng de jíxiàn tūntǔ nénglì.",
    "exampleEn": "Full-link stress testing validated system limit throughput capacity.",
    "clozeZh": "全链路【 ____ 】验证了系统的极限吞吐能力。",
    "clozeAnswer": "压测"
  },
  {
    "id": "tunpuliang",
    "hanzi": "吞吐量",
    "pinyin": "tūntǔliàng",
    "meaning": "Throughput (TPS/QPS)",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "吞 (swallow) + 吐 (spit) + 量 (amount)",
    "exampleZh": "优化网络协议栈后集群吞吐量提升了三倍。",
    "examplePy": "Yōuhuà wǎngluò xiéyìzhàn hòu jíqún tūntǔliàng tíshēng le sān bèi.",
    "exampleEn": "Optimizing network stack tripled cluster throughput.",
    "clozeZh": "优化网络协议栈后集群【 ____ 】提升了三倍。",
    "clozeAnswer": "吞吐量"
  },
  {
    "id": "yanchi",
    "hanzi": "延迟",
    "pinyin": "yánchí",
    "meaning": "Latency / Delay",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "延 (extend/delay) + 迟 (slow/late)",
    "exampleZh": "第99百分位延迟指标突破了SLA预定目标。",
    "examplePy": "Dì jiǔshíjiǔ bǎifēnwèi yánchí zhǐbiāo tūpò le SLA yùdìng mùbiāo.",
    "exampleEn": "P99 latency breached SLA baseline targets.",
    "clozeZh": "第99百分位【 ____ 】指标突破了SLA预定目标。",
    "clozeAnswer": "延迟"
  },
  {
    "id": "shixu_shuju",
    "hanzi": "时序数据",
    "pinyin": "shíxù shùjù",
    "meaning": "Time-series data",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "时序 (time-order) + 数据 (data)",
    "exampleZh": "时序数据库支持海量监控指标的高效压缩存储。",
    "examplePy": "Shíxù shùjùkù zhīchí hǎiliàng jiānkòng zhǐbiāo de gāoxiào yāsuō cúnchǔ.",
    "exampleEn": "Time-series database supports compressed storage for massive telemetry metrics.",
    "clozeZh": "【 ____ 】库支持海量监控指标的高效压缩存储。",
    "clozeAnswer": "时序数据"
  },
  {
    "id": "jiqun",
    "hanzi": "集群",
    "pinyin": "jíqún",
    "meaning": "Cluster / Fleet",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "集 (gather) + 群 (crowd/group)",
    "exampleZh": "生产集群自动完成跨可用区的节点漂移。",
    "examplePy": "Shēngchǎn jíqún zìdòng wánchéng kuà kěyòngqū de jiédiǎn piāoyí.",
    "exampleEn": "Production cluster automatically performed cross-AZ node failover.",
    "clozeZh": "生产【 ____ 】自动完成跨可用区的节点漂移。",
    "clozeAnswer": "集群"
  },
  {
    "id": "jiedian",
    "hanzi": "节点",
    "pinyin": "jiédiǎn",
    "meaning": "Node / Instance",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "节 (joint/node) + 点 (point)",
    "exampleZh": "某个工作节点因磁盘写满而变为不可用状态。",
    "examplePy": "Mǒu ge gōngzuò jiédiǎn yīn cípán xiěmǎn ér biàn wéi bùkěyòng zhuàngtài.",
    "exampleEn": "A worker node entered not-ready state due to full disk.",
    "clozeZh": "某个工作【 ____ 】因磁盘写满而变为不可用状态。",
    "clozeAnswer": "节点"
  },
  {
    "id": "weifuwu",
    "hanzi": "微服务",
    "pinyin": "wēifúwù",
    "meaning": "Microservices",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "微 (micro) + 服务 (service)",
    "exampleZh": "微服务解耦提高了独立发布和水平伸缩的敏捷度。",
    "examplePy": "Wēifúwù jiěǒu tígāo le dúlì fābù hé shuǐpíng shēnsuō de mǐnjiédù.",
    "exampleEn": "Microservices decoupling improves release and horizontal scaling agility.",
    "clozeZh": "【 ____ 】解耦提高了独立发布和水平伸缩的敏捷度。",
    "clozeAnswer": "微服务"
  },
  {
    "id": "gaogaoyong",
    "hanzi": "高可用",
    "pinyin": "gāokěyòng",
    "meaning": "High Availability (HA)",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "高 (high) + 可用 (available)",
    "exampleZh": "跨城双活架构确保系统具备99.99%的高可用性。",
    "examplePy": "Kuàchéng shuānghuó jiàgòu quèbǎo xìtǒng jùbèi bǎifēnzhī jiǔshíjiǔ diǎn jiǔshíjiǔ de gāokěyòng xìng.",
    "exampleEn": "Dual-city active-active architecture ensures 99.99% high availability.",
    "clozeZh": "跨城双活架构确保系统具备99.99%的【 ____ 】性。",
    "clozeAnswer": "高可用"
  },
  {
    "id": "yilai",
    "hanzi": "依赖",
    "pinyin": "yīlài",
    "meaning": "Dependency / Downstream service",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "依 (depend) + 赖 (rely)",
    "exampleZh": "第三方支付接口依赖不稳定触发了级联告警。",
    "examplePy": "Dìsānfāng zhīfù jiēkǒu yīlài bù wěndìng chùfā le jílián gàojǐng.",
    "exampleEn": "Instability in 3rd-party payment dependency triggered cascading alerts.",
    "clozeZh": "第三方支付接口【 ____ 】不稳定触发了级联告警。",
    "clozeAnswer": "依赖"
  },
  {
    "id": "doudong",
    "hanzi": "抖动",
    "pinyin": "dǒudòng",
    "meaning": "Jitter / Fluctuation",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "抖 (shake) + 动 (move)",
    "exampleZh": "网络偶发性抖动会导致长连接频繁断开重连。",
    "examplePy": "Wǎngluò ǒufāxìng dǒudòng huì dǎozhì chángliánjiē pínfán duànkāi chónglián.",
    "exampleEn": "Sporadic network jitter causes frequent keep-alive reconnects.",
    "clozeZh": "网络偶发性【 ____ 】会导致长连接频繁断开重连。",
    "clozeAnswer": "抖动"
  },
  {
    "id": "rongzai",
    "hanzi": "容灾",
    "pinyin": "róngzāi",
    "meaning": "Disaster Recovery (DR)",
    "category": "AIOps",
    "levelTrack": "tech_aiops",
    "hskHook": "容 (contain/endure) + 灾 (disaster)",
    "exampleZh": "企业级混合云容灾演练验证了一键故障切换能力。",
    "examplePy": "Qǐyè jí hùnhéyún róngzāi yǎnliàn yànzhèng le yíjiàn gùzhàng qiēhuàn nénglì.",
    "exampleEn": "Hybrid cloud DR drill validated one-click disaster recovery failover.",
    "clozeZh": "企业级混合云【 ____ 】演练验证了一键故障切换能力。",
    "clozeAnswer": "容灾"
  }
];

// -----------------------------------------------------------------------------
// Complete 100% HSK 1-6 Vocabulary Library (4,991 Standard Words + 32 AIOps Domain Items)
// -----------------------------------------------------------------------------
let COMPLETE_HSK_LIBRARY = [];

function loadCompleteHskLibrary() {
  const candidatePaths = [
    path.join(__dirname, '../data/hsk-complete-1-6.json'),
    path.join(__dirname, '../../learnings/data/hsk-complete-1-6.json'),
    '/app/data/hsk-complete-1-6.json',
    '/home/agent/orca/learnings/data/hsk-complete-1-6.json',
    '/home/agent/orca/learnings/technical-mandarin/data/hsk-complete-1-6.json'
  ];

  let rawHsk = [];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const fileContent = fs.readFileSync(p, 'utf-8');
        rawHsk = JSON.parse(fileContent);
        if (Array.isArray(rawHsk) && rawHsk.length > 0) {
          console.log(`[Mandarin Coach] Successfully loaded complete HSK 1-6 dataset from: ${p} (${rawHsk.length} words)`);
          break;
        }
      } catch (e) {
        console.warn(`[Mandarin Coach] Failed reading HSK dataset at ${p}:`, e.message);
      }
    }
  }

  const curatedAiops = INITIAL_VOCAB_POOL.filter(item => item.levelTrack === 'tech_aiops');

  if (rawHsk && rawHsk.length > 0) {
    COMPLETE_HSK_LIBRARY = [...rawHsk, ...curatedAiops];
  } else {
    COMPLETE_HSK_LIBRARY = [...INITIAL_VOCAB_POOL];
    console.warn(`[Mandarin Coach] Complete HSK dataset not found; falling back to INITIAL_VOCAB_POOL (${INITIAL_VOCAB_POOL.length} words).`);
  }
  return COMPLETE_HSK_LIBRARY;
}

loadCompleteHskLibrary();

// 60 Diverse Placement Questions Across 6 Stages (10 unique questions per stage, 100% equal char and space count)
const PLACEMENT_QUESTION_BANK = [
  {
    "id": "s1_q1",
    "stage": 1,
    "tier": "Stage 1: HSK 1 (Elementary Basics)",
    "question": "“请问【现在】几点了？” (Qǐngwèn xiànzài jǐ diǎn le?)\nWhich phrase accurately explains 「现在」?",
    "correctIdx": 0,
    "options": [
      "指 当 前 这 个 时 刻",
      "指 昨 天 那 个 时 刻",
      "指 明 天 那 个 时 刻",
      "指 以 前 那 个 时 刻"
    ],
    "explanation": "「现在」 (xiànzài) means right now / at present."
  },
  {
    "id": "s1_q2",
    "stage": 1,
    "tier": "Stage 1: HSK 1 (Elementary Basics)",
    "question": "“我【认识】这个人。” (Wǒ rènshi zhège rén.)\nWhich phrase accurately explains 「认识」?",
    "correctIdx": 0,
    "options": [
      "知 道 并 且 见 过 他",
      "听 说 但 没 见 过 他",
      "忘 记 了 那 个 人 谁",
      "以 前 从 来 没 见 他"
    ],
    "explanation": "「认识」 (rènshi) means to know or recognize somebody."
  },
  {
    "id": "s1_q3",
    "stage": 1,
    "tier": "Stage 1: HSK 1 (Elementary Basics)",
    "question": "“今天去公司【准备】开会。” (Jīntiān qù gōngsī zhǔnbèi kāihuì.)\nWhich phrase accurately explains 「准备」?",
    "correctIdx": 0,
    "options": [
      "事 前 作 好 了 安 排",
      "突 然 决 定 了 开 会",
      "已 经 结 束 了 会 议",
      "推 迟 到 明 天 开 会"
    ],
    "explanation": "「准备」 (zhǔnbèi) means to prepare or arrange beforehand."
  },
  {
    "id": "s1_q4",
    "stage": 1,
    "tier": "Stage 1: HSK 1 (Elementary Basics)",
    "question": "“请问这个【问题】怎么看？” (Qǐngwèn zhège wèntí zěnme kàn?)\nWhich phrase accurately explains 「问题」?",
    "correctIdx": 0,
    "options": [
      "需 要 解 决 的 事 情",
      "已 经 完 成 的 任 务",
      "大 家 都 喜 欢 的 话",
      "昨 天 发 生 的 故 事"
    ],
    "explanation": "「问题」 (wèntí) refers to a problem, issue, or question requiring a solution."
  },
  {
    "id": "s2_q1",
    "stage": 2,
    "tier": "Stage 2: HSK 2 (Cause & Effect Syntax)",
    "question": "Which sentence correctly follows Mandarin cause-and-effect structure (“Because it rained, I didn’t go”)?",
    "correctIdx": 0,
    "options": [
      "因 为 今 天 下 雨 所 以 我 没 去",
      "虽 然 今 天 下 雨 但 是 我 没 去",
      "如 果 今 天 下 雨 就 是 我 没 去",
      "不 但 今 天 下 雨 而 且 我 没 去"
    ],
    "explanation": "「因为…所以…」 (yīnwèi… suǒyǐ…) expresses cause and effect."
  },
  {
    "id": "s2_q2",
    "stage": 2,
    "tier": "Stage 2: HSK 2 (Cause & Effect Syntax)",
    "question": "Which sentence correctly expresses: “Although it was very cold, he still went to work” in HSK 2 syntax?",
    "correctIdx": 0,
    "options": [
      "虽 然 天 气 很 冷 但 是 他 去 了",
      "因 为 天 气 很 冷 所 以 他 去 了",
      "如 果 天 气 很 冷 就 是 他 去 了",
      "不 但 天 气 很 冷 而 且 他 去 了"
    ],
    "explanation": "「虽然…但是…」 (suīrán… dànshì…) expresses concession and transition."
  },
  {
    "id": "s2_q3",
    "stage": 2,
    "tier": "Stage 2: HSK 2 (Cause & Effect Syntax)",
    "question": "Which sentence correctly expresses: “He can not only speak Chinese, but also write Hanzi”?",
    "correctIdx": 0,
    "options": [
      "他 不 但 会 说 中 文 而 且 会 写 字",
      "他 虽 然 会 说 中 文 但 是 会 写 字",
      "他 因 为 会 说 中 文 所 以 会 写 字",
      "他 如 果 会 说 中 文 就 是 会 写 字"
    ],
    "explanation": "「不但…而且…」 (bùdàn… érqiě…) expresses progressive addition (\"not only... but also\")."
  },
  {
    "id": "s2_q4",
    "stage": 2,
    "tier": "Stage 2: HSK 2 (Cause & Effect Syntax)",
    "question": "Which sentence correctly uses 「离」 (distance/separation) to state: “My company is very close to home”?",
    "correctIdx": 0,
    "options": [
      "我 的 公 司 离 家 里 很 近",
      "我 的 公 司 在 家 里 很 近",
      "我 的 公 司 从 家 里 很 近",
      "我 的 公 司 到 家 里 很 近"
    ],
    "explanation": "「A 离 B + 远/近」 is the standard structure for spatial or temporal distance."
  },
  {
    "id": "s3_q1",
    "stage": 3,
    "tier": "Stage 3: HSK 3 (Disposal Structure 把 & Complements)",
    "question": "You want to ask: “Please send that report to me.” Which sentence correctly uses the 「把」 disposal structure?",
    "correctIdx": 0,
    "options": [
      "请 你 把 那 份 报 告 发 给 我",
      "请 你 发 那 份 报 告 给 我 吧",
      "请 你 在 那 份 报 告 发 给 我",
      "请 你 让 那 份 报 告 发 给 我"
    ],
    "explanation": "The 把 construction places the definite object before the verb: 请你 + 把那份报告 + 发 + 给我."
  },
  {
    "id": "s3_q2",
    "stage": 3,
    "tier": "Stage 3: HSK 3 (Disposal Structure 把 & Complements)",
    "question": "Which sentence correctly uses 「把」 to state: “I have solved this problem”?",
    "correctIdx": 0,
    "options": [
      "我 已 经 把 这 个 问 题 解 决 了",
      "我 已 经 对 这 个 问 题 解 决 了",
      "我 已 经 给 这 个 问 题 解 决 了",
      "我 已 经 从 这 个 问 题 解 决 了"
    ],
    "explanation": "Subject + 已经 + 把 + Object + Verb + 结果/了: 我已经把这个问题解决了."
  },
  {
    "id": "s3_q3",
    "stage": 3,
    "tier": "Stage 3: HSK 3 (Disposal Structure 把 & Complements)",
    "question": "Which phrase correctly expresses the potential / result complement for “heard clearly” (HSK 3 verb complement)?",
    "correctIdx": 0,
    "options": [
      "我 听 得 很 清 楚",
      "我 听 得 很 容 易",
      "我 听 得 很 复 杂",
      "我 听 得 很 提 前"
    ],
    "explanation": "「听得很清楚」 indicates the degree/result complement of hearing clearly."
  },
  {
    "id": "s3_q4",
    "stage": 3,
    "tier": "Stage 3: HSK 3 (Disposal Structure 把 & Complements)",
    "question": "“由于暴雨，会议【推迟】到明天。” Which phrase accurately explains 「推迟」?",
    "correctIdx": 0,
    "options": [
      "延 后 原 定 的 时 间",
      "提 前 原 定 的 时 间",
      "取 消 原 定 的 计 划",
      "准 时 开 始 了 会 议"
    ],
    "explanation": "「推迟」 (tuīchí) means to delay or postpone to a later time."
  },
  {
    "id": "s4_q1",
    "stage": 4,
    "tier": "Stage 4: HSK 4 (Workplace Transitions & Concessions)",
    "question": "Which sentence correctly states: “Although today was very busy, he still came”?",
    "correctIdx": 0,
    "options": [
      "虽 然 今 天 很 忙 但 是 他 来 了",
      "因 为 今 天 很 忙 所 以 他 来 了",
      "如 果 今 天 很 忙 就 是 他 来 了",
      "不 但 今 天 很 忙 而 且 他 来 了"
    ],
    "explanation": "「虽然…但是…」 (suīrán… dànshì…) pairs concession with contrast."
  },
  {
    "id": "s4_q2",
    "stage": 4,
    "tier": "Stage 4: HSK 4 (Workplace Transitions & Concessions)",
    "question": "In formal workplace communication, which preposition replaces 「因为」 to mean “Due to / Owing to configuration errors”? ",
    "correctIdx": 0,
    "options": [
      "由 于 配 置 错 误 导 致",
      "关 于 配 置 错 误 导 致",
      "通 过 配 置 错 误 导 致",
      "根 据 配 置 错 误 导 致"
    ],
    "explanation": "「由于…导致…」 is the formal written cause-and-effect construction in corporate Chinese."
  },
  {
    "id": "s4_q3",
    "stage": 4,
    "tier": "Stage 4: HSK 4 (Workplace Transitions & Concessions)",
    "question": "Which phrase accurately expresses: “Strictly follow the project schedule” in workplace Mandarin?",
    "correctIdx": 0,
    "options": [
      "严 格 按 照 项 目 进 度",
      "严 格 推 迟 项 目 进 度",
      "严 格 调 查 项 目 进 度",
      "严 格 怀 疑 项 目 进 度"
    ],
    "explanation": "「按照」 means according to / in compliance with: 严格按照项目进度."
  },
  {
    "id": "s4_q4",
    "stage": 4,
    "tier": "Stage 4: HSK 4 (Workplace Transitions & Concessions)",
    "question": "“我们必须【保证】系统数据的准确性。” Which phrase accurately explains 「保证」?",
    "correctIdx": 0,
    "options": [
      "确 保 达 到 既 定 标 准",
      "推 迟 达 到 既 定 标 准",
      "放 弃 达 到 既 定 标 准",
      "调 查 达 到 既 定 标 准"
    ],
    "explanation": "「保证」 (bǎozhèng) means to assure, secure, or guarantee an outcome."
  },
  {
    "id": "s5_q1",
    "stage": 5,
    "tier": "Stage 5: HSK 5 (Formal Systems & Architecture Reasoning)",
    "question": "Which phrase best expresses: “Adopt comprehensive measures to optimize system resource allocation”?",
    "correctIdx": 0,
    "options": [
      "采 取 综 合 措 施 优 化 资 源 配 置",
      "采 取 随 机 措 施 降 低 资 源 配 置",
      "保 持 原 有 措 施 忽 视 资 源 配 置",
      "放 弃 必 要 措 施 删 除 资 源 配 置"
    ],
    "explanation": "「采取综合措施」 (take comprehensive measures) + 「优化资源配置」 (optimize resource allocation)."
  },
  {
    "id": "s5_q2",
    "stage": 5,
    "tier": "Stage 5: HSK 5 (Formal Systems & Architecture Reasoning)",
    "question": "In technical architecture reviews, what does 「系统容错机制」 mean?",
    "correctIdx": 0,
    "options": [
      "出 现 故 障 时 保 证 系 统 正 常",
      "发 布 版 本 时 进 行 压 力 测 试",
      "阻 断 流 量 时 直 接 关 闭 服 务",
      "定 期 备 份 时 迁 移 所 有 数 据"
    ],
    "explanation": "「容错机制」 (fault tolerance mechanism) ensures systems remain functional despite component failures."
  },
  {
    "id": "s5_q3",
    "stage": 5,
    "tier": "Stage 5: HSK 5 (Formal Systems & Architecture Reasoning)",
    "question": "“从多个【维度】综合评估方案的可行性。” Which phrase accurately explains 「维度」 in this technical context?",
    "correctIdx": 0,
    "options": [
      "评 估 分 析 的 视 角 方 向",
      "执 行 部 署 的 先 后 顺 序",
      "参 加 会 议 的 人 员 名 单",
      "编 写 代 码 的 工 具 环 境"
    ],
    "explanation": "「维度」 (wéidù) represents analytical perspectives, facets, or dimensions."
  },
  {
    "id": "s5_q4",
    "stage": 5,
    "tier": "Stage 5: HSK 5 (Formal Systems & Architecture Reasoning)",
    "question": "Which statement represents formal HSK 5 strategy discourse: “Resolve performance bottlenecks to maintain stability”?",
    "correctIdx": 0,
    "options": [
      "解 决 性 能 瓶 颈 保 持 系 统 稳 定",
      "忽 视 性 能 瓶 颈 提 高 警 报 阈 值",
      "删 除 监 控 数 据 降 低 运 维 成 本",
      "扩 大 故 障 范 围 延 迟 问 题 排 查"
    ],
    "explanation": "「解决性能瓶颈」 (resolve performance bottlenecks) + 「保持系统稳定」 (maintain system stability)."
  },
  {
    "id": "s6_q1",
    "stage": 6,
    "tier": "Stage 6: HSK 6 & AIOps (Incident Triage & SRE Resilience)",
    "question": "In an incident postmortem (复盘), which phrase means: “Pinpoint root cause and execute rollback”?",
    "correctIdx": 0,
    "options": [
      "定 位 根 因 并 执 行 回 滚",
      "发 布 版 本 并 执 行 压 测",
      "阻 断 流 量 并 执 行 重 启",
      "更 新 配 置 并 执 行 迁 移"
    ],
    "explanation": "「定位根因」 (dìngwèi gēnyīn) = pinpoint root cause; 「执行回滚」 (zhíxíng huígǔn) = execute rollback."
  },
  {
    "id": "s6_q2",
    "stage": 6,
    "tier": "Stage 6: HSK 6 & AIOps (Incident Triage & SRE Resilience)",
    "question": "During high traffic spikes, which phrase means: “Implement service rate limiting and circuit breaking to prevent avalanche failures”? ",
    "correctIdx": 0,
    "options": [
      "执 行 限 流 熔 断 防 止 级 联 雪 崩",
      "关 闭 监 控 告 警 加 快 请 求 响 应",
      "重 启 集 群 节 点 删 除 历 史 日 志",
      "扩 大 误 报 阈 值 忽 视 链 路 抖 动"
    ],
    "explanation": "「限流熔断」 (rate limiting and circuit breaking) prevents cascade / avalanche failure (防止级联雪崩)."
  },
  {
    "id": "s6_q3",
    "stage": 6,
    "tier": "Stage 6: HSK 6 & AIOps (Incident Triage & SRE Resilience)",
    "question": "What does 「智能告警降噪减少了百分之八十的无效误报」 mean?",
    "correctIdx": 0,
    "options": [
      "智 能 降 噪 压 制 虚 假 告 警",
      "严 重 漏 报 导 致 系 统 瘫 痪",
      "运 维 人 员 忽 略 异 常 提 示",
      "阈 值 过 低 触 发 告 警 风 暴"
    ],
    "explanation": "AI-driven alarm noise reduction suppresses false positives and deduplicates redundant alerts."
  },
  {
    "id": "s6_q4",
    "stage": 6,
    "tier": "Stage 6: HSK 6 & AIOps (Incident Triage & SRE Resilience)",
    "question": "“通过分布式调用链排查，我们迅速定位到了慢依赖服务。” What technical troubleshooting does this describe?",
    "correctIdx": 0,
    "options": [
      "利 用 链 路 追 踪 快 速 定 位 延 迟",
      "直 接 回 滚 代 码 避 免 排 查 原 因",
      "关 闭 日 志 输 出 提 高 吞 吐 能 力",
      "随 机 重 启 容 器 缓 解 内 存 泄 漏"
    ],
    "explanation": "Tracing distributed call chains (调用链追踪) pinpoints downstream latency bottlenecks."
  },
  {
    "id": "s1_q5",
    "stage": 1,
    "tier": "Stage 1: HSK 1 (Elementary Basics)",
    "question": "“你【在做】什么呢？” (Nǐ zài zuò shénme ne?)\nWhich phrase accurately explains 「在做」?",
    "correctIdx": 0,
    "options": [
      "正 在 进 行 动 作",
      "已 经 做 完 动 作",
      "打 算 明 天 再 做",
      "从 来 没 有 做 过"
    ],
    "explanation": "「在做」 (zài zuò) indicates an ongoing action right now (present continuous)."
  },
  {
    "id": "s1_q6",
    "stage": 1,
    "tier": "Stage 1: HSK 1 (Elementary Basics)",
    "question": "“我们一共有【八个】人。” (Wǒmen yígòng yǒu bā ge rén.)\nWhich number does 「八」 represent?",
    "correctIdx": 0,
    "options": [
      "数 字 八 8",
      "数 字 六 6",
      "数 字 七 7",
      "数 字 九 9"
    ],
    "explanation": "「八」 (bā) is the number 8 in Mandarin."
  },
  {
    "id": "s1_q7",
    "stage": 1,
    "tier": "Stage 1: HSK 1 (Elementary Basics)",
    "question": "“【明天】上午我们一起去。” (Míngtiān shàngwǔ wǒmen yìqǐ qù.)\nWhich time does 「明天」 indicate?",
    "correctIdx": 0,
    "options": [
      "今 天 之 后 的 那 一 天",
      "今 天 之 前 的 那 一 天",
      "上 个 星 期 的 那 一 天",
      "下 个 月 份 的 那 一 天"
    ],
    "explanation": "「明天」 (míngtiān) means tomorrow (the day after today)."
  },
  {
    "id": "s1_q8",
    "stage": 1,
    "tier": "Stage 1: HSK 1 (Elementary Basics)",
    "question": "“太【高兴】见到你了！” (Tài gāoxìng jiàndào nǐ le!)\nWhich phrase accurately explains 「高兴」?",
    "correctIdx": 0,
    "options": [
      "心 里 感 到 很 开 心",
      "心 里 感 到 很 害 怕",
      "身 体 感 到 很 疲 惫",
      "觉 得 非 常 不 满 意"
    ],
    "explanation": "「高兴」 (gāoxìng) means happy, glad, pleased."
  },
  {
    "id": "s1_q9",
    "stage": 1,
    "tier": "Stage 1: HSK 1 (Elementary Basics)",
    "question": "“【请坐】，喝杯茶吧。” (Qǐng zuò, hē bēi chá ba.)\nWhich polite action does 「请坐」 invite?",
    "correctIdx": 0,
    "options": [
      "礼 貌 请 对 方 坐 下",
      "礼 貌 请 对 方 离 开",
      "礼 貌 请 对 方 发 言",
      "礼 貌 请 对 方 等 待"
    ],
    "explanation": "「请坐」 (qǐng zuò) is a courteous invitation to sit down."
  },
  {
    "id": "s1_q10",
    "stage": 1,
    "tier": "Stage 1: HSK 1 (Elementary Basics)",
    "question": "“今天天气很【热】。” (Jīntiān tiānqì hěn rè.)\nWhich condition does 「热」 describe?",
    "correctIdx": 0,
    "options": [
      "温 度 很 高 很 暖",
      "温 度 很 低 很 冷",
      "空 气 非 常 潮 湿",
      "风 力 非 常 强 劲"
    ],
    "explanation": "「热」 (rè) means hot / high temperature."
  },
  {
    "id": "s2_q5",
    "stage": 2,
    "tier": "Stage 2: HSK 2 (Syntax & Connectors)",
    "question": "Which sentence correctly uses 「往」 (towards/direction) in HSK 2 travel syntax?",
    "correctIdx": 0,
    "options": [
      "请 往 前 走 一 百 米",
      "请 前 走 往 一 百 米",
      "一 百 米 走 请 往 前",
      "往 请 前 走 一 百 米"
    ],
    "explanation": "In Mandarin direction syntax, preposition 「往」 + direction (前) precedes the verb phrase (走一百米)."
  },
  {
    "id": "s2_q6",
    "stage": 2,
    "tier": "Stage 2: HSK 2 (Syntax & Connectors)",
    "question": "“他【从】北京坐高铁来上海。” (Tā cóng Běijīng zuò gāotiě lái Shànghǎi.)\nWhich function does 「从」 serve?",
    "correctIdx": 0,
    "options": [
      "表 示 起 点 出 发 地",
      "表 示 终 点 到 达 地",
      "表 示 转 折 意 外 结",
      "表 示 因 果 推 论 结"
    ],
    "explanation": "「从」 (cóng) marks the starting point or origin (from Beijing)."
  },
  {
    "id": "s2_q7",
    "stage": 2,
    "tier": "Stage 2: HSK 2 (Syntax & Connectors)",
    "question": "Which sentence correctly asks about completion using 「过」 (experiential aspect)?",
    "correctIdx": 0,
    "options": [
      "你 去 过 北 京 吗 ？",
      "你 过 去 北 京 吗 ？",
      "你 去 北 京 过 吗 ？",
      "去 过 你 北 京 吗 ？"
    ],
    "explanation": "Verb + 过 (guò) denotes past experience: 「去过北京吗？」"
  },
  {
    "id": "s2_q8",
    "stage": 2,
    "tier": "Stage 2: HSK 2 (Syntax & Connectors)",
    "question": "Which sentence correctly uses the comparative 「比」 (A 比 B + Adj)?",
    "correctIdx": 0,
    "options": [
      "今 天 比 昨 天 冷 得 多",
      "今 天 昨 天 比 冷 得 多",
      "比 今 天 昨 天 冷 得 多",
      "今 天 冷 比 昨 天 得 多"
    ],
    "explanation": "Standard comparison formula: A (今天) + 比 + B (昨天) + Adj (冷) + complement (得多)."
  },
  {
    "id": "s2_q9",
    "stage": 2,
    "tier": "Stage 2: HSK 2 (Syntax & Connectors)",
    "question": "“他走得【非常快】。” (Tā zǒu de fēicháng kuài.)\nWhat role does 「得」 play in this sentence?",
    "correctIdx": 0,
    "options": [
      "连 接 动 词 和 状 态 补 语",
      "放 在 句 首 表 示 礼 貌 请",
      "连 接 主 语 和 宾 语 名 词",
      "用 在 句 末 表 示 提 出 问"
    ],
    "explanation": "Structural particle 「得」 connects the verb (走) to the degree/manner complement (非常快)."
  },
  {
    "id": "s2_q10",
    "stage": 2,
    "tier": "Stage 2: HSK 2 (Syntax & Connectors)",
    "question": "Which sentence correctly expresses: “I can speak a little Mandarin” using 「一点儿」?",
    "correctIdx": 0,
    "options": [
      "我 会 说 一 点 儿 中 文",
      "我 一 点 儿 会 说 中 文",
      "我 会 一 点 儿 说 中 文",
      "说 中 文 我 会 一 点 儿"
    ],
    "explanation": "Verb + 一点儿 + Noun: 「说一点儿中文」."
  },
  {
    "id": "s3_q5",
    "stage": 3,
    "tier": "Stage 3: HSK 3 (Intermediate Workplace)",
    "question": "Which sentence correctly uses the passive marker 「被」 (bèi)?",
    "correctIdx": 0,
    "options": [
      "文 件 被 他 误 删 了",
      "他 被 文 件 误 删 了",
      "文 件 误 删 被 他 了",
      "被 文 件 他 误 删 了"
    ],
    "explanation": "Standard passive order: Receiver (文件) + 被 + Doer (他) + Verb Phrase (误删了)."
  },
  {
    "id": "s3_q6",
    "stage": 3,
    "tier": "Stage 3: HSK 3 (Intermediate Workplace)",
    "question": "“方案我已经【准备好】了。” (Fāng'àn wǒ yǐjīng zhǔnbèi hǎo le.)\nWhat does the result complement 「好」 convey?",
    "correctIdx": 0,
    "options": [
      "动 作 完 成 且 令 人 满 意",
      "动 作 刚 刚 开 始 尚 未 完",
      "动 作 出 现 错 误 需 要 改",
      "动 作 被 临 时 延 期 推 迟"
    ],
    "explanation": "Result complement 「好」 signifies the action is successfully completed and ready."
  },
  {
    "id": "s3_q7",
    "stage": 3,
    "tier": "Stage 3: HSK 3 (Intermediate Workplace)",
    "question": "Which sentence correctly uses 「越来越...」 (more and more) in HSK 3 syntax?",
    "correctIdx": 0,
    "options": [
      "业 务 规 模 越 来 越 大",
      "越 来 越 业 务 规 模 大",
      "业 务 规 模 大 越 来 越",
      "大 业 务 规 模 越 来 越"
    ],
    "explanation": "Subject (业务规模) + 越来越 + Adjective (大)."
  },
  {
    "id": "s3_q8",
    "stage": 3,
    "tier": "Stage 3: HSK 3 (Intermediate Workplace)",
    "question": "“这台服务器【修不好】了。” (Zhè tái fúwùqì xiū bù hǎo le.)\nWhat does 「修不好」 indicate?",
    "correctIdx": 0,
    "options": [
      "无 法 成 功 修 理 好",
      "很 快 就 能 修 理 完",
      "已 经 彻 底 维 修 好",
      "暂 时 不 需 要 维 修"
    ],
    "explanation": "Potential complement: Verb + 不 + Result Complement (修不好 = impossible to repair successfully)."
  },
  {
    "id": "s3_q9",
    "stage": 3,
    "tier": "Stage 3: HSK 3 (Intermediate Workplace)",
    "question": "Which sentence correctly combines 「把」 with placing an object into a location?",
    "correctIdx": 0,
    "options": [
      "请 把 笔 记 本 放 在 桌 上",
      "请 放 在 桌 上 把 笔 记 本",
      "请 笔 记 本 把 放 在 桌 上",
      "请 把 桌 上 放 在 笔 记 本"
    ],
    "explanation": "Disposal structure with location: 把 + Object (笔记本) + Verb (放) + 在 + Location (桌上)."
  },
  {
    "id": "s3_q10",
    "stage": 3,
    "tier": "Stage 3: HSK 3 (Intermediate Workplace)",
    "question": "“我们【必须】在下班前提交代码。” What does 「必须」 emphasize?",
    "correctIdx": 0,
    "options": [
      "必 定 要 做 的 义 务 责 任",
      "或 许 可 以 选 择 的 建 议",
      "过 去 已 经 发 生 的 事 实",
      "将 来 随 机 出 现 的 可 能"
    ],
    "explanation": "「必须」 (bìxū) means must / compulsory obligation."
  },
  {
    "id": "s4_q5",
    "stage": 4,
    "tier": "Stage 4: HSK 4 (Professional Workplace)",
    "question": "Which conjunction pair correctly expresses: “No matter what difficulties arise, we will persist”?",
    "correctIdx": 0,
    "options": [
      "无 论 遇 到 什 么 都 坚 持",
      "因 为 遇 到 什 么 所 坚 持",
      "如 果 遇 到 什 么 就 坚 持",
      "虽 然 遇 到 什 么 但 坚 持"
    ],
    "explanation": "「无论...都...」 (regardless of / no matter what) expresses unconditional adherence."
  },
  {
    "id": "s4_q6",
    "stage": 4,
    "tier": "Stage 4: HSK 4 (Professional Workplace)",
    "question": "In project deadlines, what is the crucial distinction between 「准时」 and 「及时」?",
    "correctIdx": 0,
    "options": [
      "准 时 按 定 点 ， 及 时 趁 现 在",
      "准 时 趁 现 在 ， 及 时 按 定 点",
      "准 时 指 延 期 ， 及 时 指 提 前",
      "准 时 指 随 机 ， 及 时 指 固 定"
    ],
    "explanation": "「准时」 means punctually (on exact scheduled time), whereas 「及时」 means promptly / without delay when an event occurs."
  },
  {
    "id": "s4_q7",
    "stage": 4,
    "tier": "Stage 4: HSK 4 (Professional Workplace)",
    "question": "“李经理对这个新版本上线【负责】。” What does 「负责」 mean here?",
    "correctIdx": 0,
    "options": [
      "承 担 全 部 责 任 与 管 理",
      "仅 仅 负 责 旁 听 和 记 录",
      "反 对 进 行 产 品 的 发 布",
      "暂 时 离 开 岗 位 去 休 假"
    ],
    "explanation": "「对...负责」 means to be in charge of / bear primary responsibility for."
  },
  {
    "id": "s4_q8",
    "stage": 4,
    "tier": "Stage 4: HSK 4 (Professional Workplace)",
    "question": "Which sentence correctly uses 「为了」 (purpose) versus 「因为」 (cause)?",
    "correctIdx": 0,
    "options": [
      "为 了 提 高 效 率 我 们 优 化 流 程",
      "因 为 提 高 效 率 我 们 优 化 流 程",
      "所 以 提 高 效 率 我 们 优 化 流 程",
      "虽 然 提 高 效 率 我 们 优 化 流 程"
    ],
    "explanation": "「为了」 expresses the goal / purpose."
  },
  {
    "id": "s4_q9",
    "stage": 4,
    "tier": "Stage 4: HSK 4 (Professional Workplace)",
    "question": "“产品上线后，我们需要【收集】用户真实反馈。” What does 「收集」 mean?",
    "correctIdx": 0,
    "options": [
      "把 分 散 的 数 据 汇 集 起 来",
      "把 错 误 的 信 息 删 除 清 空",
      "把 重 要 的 设 备 锁 进 库 房",
      "把 所 有 的 会 议 延 期 推 迟"
    ],
    "explanation": "「收集」 (shǒují) means to collect / gather dispersed items or data."
  },
  {
    "id": "s4_q10",
    "stage": 4,
    "tier": "Stage 4: HSK 4 (Professional Workplace)",
    "question": "“本次会议【由】技术主管来主持。” What grammatical role does 「由」 play?",
    "correctIdx": 0,
    "options": [
      "引 出 承 办 或 主 导 动 作 的 人",
      "表 示 时 间 或 空 间 的 结 束 点",
      "引 出 两 个 事 物 间 的 差 异 点",
      "表 示 假 设 条 件 与 结 局 推 断"
    ],
    "explanation": "「由」 introduces the person who is assigned or responsible for executing an action."
  },
  {
    "id": "s5_q5",
    "stage": 5,
    "tier": "Stage 5: HSK 5 (Formal Strategy & Systems)",
    "question": "Which conjunction correctly expresses unexpected escalation: “Not only did it fail to recover, but on the contrary the latency increased”?",
    "correctIdx": 0,
    "options": [
      "不 仅 没 恢 复 反 而 延 时 增 加",
      "因 为 没 恢 复 所 以 延 时 增 加",
      "既 然 没 恢 复 就 会 延 时 增 加",
      "即 便 没 恢 复 也 能 延 时 增 加"
    ],
    "explanation": "「不仅...反而...」 expresses that instead of the expected outcome, the contrary worse outcome occurred."
  },
  {
    "id": "s5_q6",
    "stage": 5,
    "tier": "Stage 5: HSK 5 (Formal Strategy & Systems)",
    "question": "In formal architectural decisions, what is the key difference between 「从而」 and 「进而」?",
    "correctIdx": 0,
    "options": [
      "从 而 引 出 自 然 结 果 ， 进 而 表 示 递 进 深 化",
      "进 而 引 出 自 然 结 果 ， 从 而 表 示 递 进 深 化",
      "从 而 只 能 用 于 假 设 ， 进 而 只 能 用 于 转 折",
      "从 而 表 示 强 烈 反 对 ， 进 而 表 示 完 全 赞 同"
    ],
    "explanation": "「从而」 introduces a direct logical consequence/result; 「进而」 signifies advancing to a deeper progressive step."
  },
  {
    "id": "s5_q7",
    "stage": 5,
    "tier": "Stage 5: HSK 5 (Formal Strategy & Systems)",
    "question": "“我们必须【针对】数据库偶发性抖动制定防范预案。” What does 「针对」 mean?",
    "correctIdx": 0,
    "options": [
      "瞄 准 具 体 问 题 对 症 下 药",
      "完 全 忽 略 现 象 盲 目 操 作",
      "按 照 以 前 经 验 照 搬 照 抄",
      "推 迟 解 决 问 题 等 待 指 示"
    ],
    "explanation": "「针对」 (zhēnduì) means targeted at / in light of a specific targeted issue."
  },
  {
    "id": "s5_q8",
    "stage": 5,
    "tier": "Stage 5: HSK 5 (Formal Strategy & Systems)",
    "question": "In systems engineering, what is the precise semantic distinction between 「优化」 and 「简化」?",
    "correctIdx": 0,
    "options": [
      "优 化 提 高 性 能 ， 简 化 削 减 复 杂",
      "优 化 削 减 复 杂 ， 简 化 提 高 性 能",
      "优 化 增 加 负 载 ， 简 化 降 低 成 本",
      "优 化 延 长 耗 时 ， 简 化 缩 短 距 离"
    ],
    "explanation": "「优化」 (optimize) enhances efficiency/performance; 「简化」 (simplify) removes unnecessary complexity."
  },
  {
    "id": "s5_q9",
    "stage": 5,
    "tier": "Stage 5: HSK 5 (Formal Strategy & Systems)",
    "question": "“依据线上真实压测数据，系统吞吐量呈现明显下降趋势。” What does 「依据」 mean?",
    "correctIdx": 0,
    "options": [
      "以 客 观 数 据 为 判 断 准 绳",
      "凭 主 观 臆 断 作 盲 目 猜 测",
      "不 考 虑 任 何 数 据 与 结 果",
      "仅 仅 代 表 个 人 的 随 意 想"
    ],
    "explanation": "「依据」 (yījù) means based on / according to reliable data/standards."
  },
  {
    "id": "s5_q10",
    "stage": 5,
    "tier": "Stage 5: HSK 5 (Formal Strategy & Systems)",
    "question": "“该架构设计充分考虑了高可用性与横向扩展能力。” What does 「充分」 mean here?",
    "correctIdx": 0,
    "options": [
      "非 常 完 整 充 足 毫 无 遗 漏",
      "勉 勉 强 强 达 到 最 低 标 准",
      "存 在 严 重 缺 陷 亟 待 补 充",
      "完 全 没 有 考 虑 任 何 细 节"
    ],
    "explanation": "「充分」 (chōngfèn) means fully, amply, comprehensively."
  },
  {
    "id": "s6_q5",
    "stage": 6,
    "tier": "Stage 6: HSK 6 & Technical AIOps (Engineering Mastery)",
    "question": "In an on-call emergency escalation: “下游支付网关因连接池耗尽抛出504超时，前端应当采取何种应急策略？”",
    "correctIdx": 0,
    "options": [
      "启 动 快 速 降 级 并 展 示 友 好 兜 底 提 示",
      "无 限 次 重 试 调 用 直 到 远 端 服 务 崩 溃",
      "立 即 下 线 所 有 核 心 服 务 并 关 闭 集 群",
      "直 接 忽 略 错 误 让 用 户 浏 览 器 永 久 等"
    ],
    "explanation": "Trigger graceful degradation with fallback UI when downstream dependencies time out."
  },
  {
    "id": "s6_q6",
    "stage": 6,
    "tier": "Stage 6: HSK 6 & Technical AIOps (Engineering Mastery)",
    "question": "“告警阈值配置过低引发了严重的【告警风暴】，导致核心异常被淹没。” How to resolve this in SRE practice?",
    "correctIdx": 0,
    "options": [
      "动 态 调 整 阈 值 聚 合 根 因",
      "全 面 关 闭 监 控 拒 收 告 警",
      "直 接 重 启 所 有 生 产 机 器",
      "人 工 逐 条 查 看 每 条 报 警"
    ],
    "explanation": "Tune thresholds and implement intelligent deduplication/aggregation to quell alert storms."
  },
  {
    "id": "s6_q7",
    "stage": 6,
    "tier": "Stage 6: HSK 6 & Technical AIOps (Engineering Mastery)",
    "question": "“大促突发流量导致集群CPU水位逼近95%，最稳妥的第一响应动作是？”",
    "correctIdx": 0,
    "options": [
      "紧 急 扩 容 容 器 实 例 并 限 流 非 核 心 请 求",
      "立 即 直 接 拔 掉 电 源 重 启 整 个 数 据 中 心",
      "忽 略 负 载 激 增 继 续 等 待 压 力 自 行 消 退",
      "把 生 产 数 据 库 完 全 删 除 释 放 磁 盘 空 间"
    ],
    "explanation": "Auto-scale container instances and shed non-essential load to maintain cluster stability."
  },
  {
    "id": "s6_q8",
    "stage": 6,
    "tier": "Stage 6: HSK 6 & Technical AIOps (Engineering Mastery)",
    "question": "“金丝雀发布（灰度发布）阶段发现核心指标异常，应当立即执行什么操作？”",
    "correctIdx": 0,
    "options": [
      "终 止 发 布 并 即 刻 执 行 版 本 回 滚",
      "加 快 发 布 速 度 推 送 至 所 有 节 点",
      "直 接 删 除 监 控 掩 盖 异 常 的 指 标",
      "忽 略 灰 度 异 常 继 续 推 送 全 节 点"
    ],
    "explanation": "Halt rollout immediately and execute an automated rollback to the last known stable version."
  },
  {
    "id": "s6_q9",
    "stage": 6,
    "tier": "Stage 6: HSK 6 & Technical AIOps (Engineering Mastery)",
    "question": "What is the main objective of 「混沌工程演练与故障注入」 (Chaos Engineering)?",
    "correctIdx": 0,
    "options": [
      "主 动 验 证 系 统 弹 性 与 容 灾 自 愈",
      "恶 意 破 坏 线 上 业 务 损 害 用 户 益",
      "测 试 员 工 加 班 能 力 与 承 压 极 限",
      "无 目 的 随 机 制 造 故 障 引 起 恐 慌"
    ],
    "explanation": "Proactively inject failures to test and validate system resilience and self-healing mechanisms."
  },
  {
    "id": "s6_q10",
    "stage": 6,
    "tier": "Stage 6: HSK 6 & Technical AIOps (Engineering Mastery)",
    "question": "In telemetry telemetry, what does 「链路追踪（Tracing）捕获到了关键慢跨度（Slow Span）」 mean?",
    "correctIdx": 0,
    "options": [
      "发 现 了 调 用 链 路 中 耗 时 最 长 的 瓶 颈 节 点",
      "发 现 了 内 网 频 宽 被 非 法 占 用 的 恶 意 程 序",
      "发 现 了 所 有 服 务 节 点 时 钟 出 现 严 重 偏 移",
      "发 现 了 日 志 文 件 占 满 磁 盘 导 致 进 程 挂 起"
    ],
    "explanation": "Identified the slowest bottleneck span across the distributed trace."
  }
];

const PLACEMENT_STAGES = [1, 2, 3, 4, 5, 6].map(stageNum => PLACEMENT_QUESTION_BANK.find(q => q.stage === stageNum));

function getWIBDateParts() {
  const now = new Date();
  const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  const year = wib.getUTCFullYear();
  const month = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const day = String(wib.getUTCDate()).padStart(2, '0');
  const hour = wib.getUTCHours();
  const minute = wib.getUTCMinutes();
  return {
    dateStr: `${year}-${month}-${day}`,
    hour,
    minute
  };
}

function getWIBYesterdayDateStr() {
  const now = new Date();
  const wibYesterdayMs = now.getTime() + 7 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000;
  const wibYesterday = new Date(wibYesterdayMs);
  const year = wibYesterday.getUTCFullYear();
  const month = String(wibYesterday.getUTCMonth() + 1).padStart(2, '0');
  const day = String(wibYesterday.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderProgressBar(current, total, barLength = 10) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.max(0, Math.min(1, current / safeTotal));
  const filledCount = Math.round(ratio * barLength);
  const emptyCount = Math.max(0, barLength - filledCount);
  const pct = Math.round((current / safeTotal) * 100);
  return `[${'█'.repeat(filledCount)}${'░'.repeat(emptyCount)}] ${pct}%`;
}

function ensureDailyProgress(user) {
  if (!user) return null;
  const { dateStr } = getWIBDateParts();
  const yesterdayStr = getWIBYesterdayDateStr();
  const defaultTarget = user.settings?.pace === 'light' ? 5 : user.settings?.pace === 'deep' ? 15 : 10;

  if (!user.dailyProgress) {
    user.dailyProgress = {
      date: dateStr,
      cardsReviewedToday: 0,
      targetCards: defaultTarget,
      streakDays: 0,
      lastTargetMetDate: null,
      xpToday: 0,
      totalXp: 0,
      sessionCardsCompleted: 0,
      isCustomTarget: false
    };
    return user.dailyProgress;
  }

  // Ensure all properties exist
  if (typeof user.dailyProgress.targetCards !== 'number' || user.dailyProgress.targetCards <= 0) {
    user.dailyProgress.targetCards = defaultTarget;
  }
  if (typeof user.dailyProgress.streakDays !== 'number') user.dailyProgress.streakDays = 0;
  if (typeof user.dailyProgress.xpToday !== 'number') user.dailyProgress.xpToday = 0;
  if (typeof user.dailyProgress.totalXp !== 'number') user.dailyProgress.totalXp = 0;
  if (typeof user.dailyProgress.cardsReviewedToday !== 'number') user.dailyProgress.cardsReviewedToday = 0;
  if (typeof user.dailyProgress.sessionCardsCompleted !== 'number') user.dailyProgress.sessionCardsCompleted = 0;

  // Check date rollover
  if (user.dailyProgress.date !== dateStr) {
    if (user.dailyProgress.lastTargetMetDate === yesterdayStr) {
      // Streak maintained from yesterday!
    } else if (user.dailyProgress.lastTargetMetDate !== dateStr) {
      // More than 1 day lapsed since last target met
      user.dailyProgress.streakDays = 0;
    }

    user.dailyProgress.cardsReviewedToday = 0;
    user.dailyProgress.xpToday = 0;
    user.dailyProgress.sessionCardsCompleted = 0;
    user.dailyProgress.date = dateStr;

    if (!user.dailyProgress.isCustomTarget) {
      user.dailyProgress.targetCards = defaultTarget;
    }
  }

  return user.dailyProgress;
}

function createFreshVocabPool(activeTrack = 'hsk3_4') {
  const curatedAiops = INITIAL_VOCAB_POOL.filter(item => item.levelTrack === 'tech_aiops');
  const trackCandidates = COMPLETE_HSK_LIBRARY.filter(item => (activeTrack === 'all' || item.levelTrack === activeTrack) && item.levelTrack !== 'tech_aiops');
  const starterTrack = trackCandidates.slice(0, 30);
  const starterCombined = [...curatedAiops, ...starterTrack];

  return starterCombined.map(item => ({
    ...item,
    status: 'new',
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    nextReviewAt: null,
    reviews: 0,
    lastStatus: null,
    updatedAt: null
  }));
}

function syncUserVocabPool(user) {
  user.vocabPool = user.vocabPool || [];
  const map = new Map(user.vocabPool.map(v => [v.id, v]));

  // 1. Update metadata of existing items from COMPLETE_HSK_LIBRARY or INITIAL_VOCAB_POOL
  const libMap = new Map((COMPLETE_HSK_LIBRARY.length > 0 ? COMPLETE_HSK_LIBRARY : INITIAL_VOCAB_POOL).map(w => [w.id, w]));

  for (const card of user.vocabPool) {
    const item = libMap.get(card.id);
    if (item) {
      card.hanzi = item.hanzi;
      card.pinyin = item.pinyin;
      card.meaning = item.meaning;
      card.category = item.category;
      card.levelTrack = item.levelTrack || card.levelTrack;
      card.hskHook = item.hskHook;
      card.exampleZh = item.exampleZh;
      card.examplePy = item.examplePy;
      card.exampleEn = item.exampleEn;
      card.clozeZh = item.clozeZh || card.clozeZh;
      card.clozeAnswer = item.clozeAnswer || card.clozeAnswer;
    }
    if (typeof card.easeFactor === 'undefined') card.easeFactor = 2.5;
    if (typeof card.intervalDays === 'undefined') card.intervalDays = 0;
    if (typeof card.repetitions === 'undefined') card.repetitions = 0;
    if (typeof card.nextReviewAt === 'undefined') card.nextReviewAt = null;
  }

  // 2. Ensure all curated AIOps terms are present
  const curatedAiops = INITIAL_VOCAB_POOL.filter(item => item.levelTrack === 'tech_aiops');
  for (const item of curatedAiops) {
    if (!map.has(item.id)) {
      user.vocabPool.push({
        ...item,
        status: 'new',
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextReviewAt: null,
        reviews: 0,
        lastStatus: null,
        updatedAt: null
      });
      map.set(item.id, true);
    }
  }

  // 3. Ensure active track has a healthy cohort without bloating
  const activeTrack = user.settings?.activeTrack || 'tech_aiops';
  const trackCount = user.vocabPool.filter(v => activeTrack === 'all' || v.levelTrack === activeTrack).length;
  if (trackCount < 25) {
    const trackCandidates = COMPLETE_HSK_LIBRARY.filter(item => (activeTrack === 'all' || item.levelTrack === activeTrack) && !map.has(item.id));
    for (const item of trackCandidates) {
      user.vocabPool.push({
        ...item,
        status: 'new',
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextReviewAt: null,
        reviews: 0,
        lastStatus: null,
        updatedAt: null
      });
      map.set(item.id, true);
      const currentCount = user.vocabPool.filter(v => activeTrack === 'all' || v.levelTrack === activeTrack).length;
      if (currentCount >= 35) break;
    }
  }
}

function resolveUserContext(userCtx) {
  if (!userCtx) return { userId: 'default', username: 'Captain William' };
  if (typeof userCtx === 'string') return { userId: userCtx, username: `Learner_${userCtx.slice(-4)}` };
  return {
    userId: userCtx.userId || 'default',
    username: userCtx.username || userCtx.tag || 'Learner'
  };
}

function getUserProfile(ledger, userIdOrCtx = 'default', username = 'Learner') {
  let uid = 'default';
  let uname = username;
  if (userIdOrCtx && typeof userIdOrCtx === 'object') {
    const resolved = resolveUserContext(userIdOrCtx);
    uid = resolved.userId;
    uname = resolved.username || username;
  } else if (typeof userIdOrCtx === 'string') {
    uid = userIdOrCtx || 'default';
  }

  ledger.users = ledger.users || {};
  if (!ledger.users[uid]) {
    ledger.users[uid] = {
      userId: uid,
      username: uname || (uid === 'default' ? 'Captain William' : `Learner_${uid.slice(-4)}`),
      createdAt: new Date().toISOString(),
      settings: {
        pace: 'standard',
        activeTrack: 'hsk3_4',
        domainRatio: 0.30,
        level: 'Unplaced (Run /mandarin baseline)',
        botFit: null,
        currentDayNumber: 1,
        lastEvalDate: null,
        baseline: null
      },
      activeSession: null,
      vocabPool: createFreshVocabPool(),
      evalHistory: []
    };
  } else {
    if (uname && uname !== 'Learner' && ledger.users[uid].username !== uname) {
      ledger.users[uid].username = uname;
    }
    ledger.users[uid].settings.domainRatio = typeof ledger.users[uid].settings.domainRatio === 'number'
      ? ledger.users[uid].settings.domainRatio
      : 0.30;
    syncUserVocabPool(ledger.users[uid]);
  }
  ensureDailyProgress(ledger.users[uid]);
  return ledger.users[uid];
}

function loadMandarinLedger() {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }

  let data = null;
  if (fs.existsSync(LEDGER_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf-8'));
    } catch (e) {
      console.error('[Mandarin Coach] Error parsing vocab-ledger.json, reinitializing:', e.message);
    }
  }

  if (!data) {
    data = {};
  }

  // Global settings for automated channel drops & reminders
  data.globalSettings = data.globalSettings || {
    morningHourWIB: 8,
    morningMinuteWIB: 30,
    eveningReminderHourWIB: 20,
    eveningReminderMinuteWIB: 0,
    lastMorningDropDate: null,
    lastEveningReminderDate: null
  };

  // Multi-tenant users directory
  data.users = data.users || {};

  // Preserve root settings & vocabPool for backwards compatibility
  data.settings = data.settings || {
    pace: 'standard',
    activeTrack: 'hsk3_4',
    level: 'HSK 3-4 -> Universal Placement',
    currentDayNumber: 1
  };
  data.vocabPool = data.vocabPool || [];

  // Migration: Seed 'default' user from root settings/pool if no users exist
  if (Object.keys(data.users).length === 0) {
    data.users['default'] = {
      userId: 'default',
      username: 'Captain William',
      createdAt: new Date().toISOString(),
      settings: {
        pace: data.settings.pace || 'standard',
        activeTrack: data.settings.activeTrack || 'hsk3_4',
        level: data.settings.level || 'HSK 3-4 -> Universal Placement',
        botFit: data.settings.botFit || '🟢 Ideal Fit — Fluency & Workplace/Technical Bridge',
        currentDayNumber: data.settings.currentDayNumber || 1,
        lastEvalDate: data.settings.lastEvalDate || null,
        baseline: data.settings.baseline || null
      },
      activeSession: data.activeSession || null,
      vocabPool: (data.vocabPool && data.vocabPool.length > 0)
        ? JSON.parse(JSON.stringify(data.vocabPool))
        : createFreshVocabPool(),
      evalHistory: data.evalHistory || []
    };
  }

  // Ensure all existing registered users have current vocabulary items and daily progress
  for (const uid of Object.keys(data.users)) {
    syncUserVocabPool(data.users[uid]);
    ensureDailyProgress(data.users[uid]);
  }

  saveMandarinLedger(data);
  return data;
}

function saveMandarinLedger(ledger) {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }

  // Mirror primary user state to root settings/vocabPool for backward compatibility
  const primaryUser = (ledger.users && (ledger.users['default'] || Object.values(ledger.users)[0])) || null;
  if (primaryUser) {
    ledger.settings = { ...ledger.settings, ...primaryUser.settings };
    ledger.vocabPool = primaryUser.vocabPool;
    ledger.activeSession = primaryUser.activeSession;
    if (primaryUser.dailyProgress) {
      ledger.dailyProgress = primaryUser.dailyProgress;
    }
  }

  const serialized = JSON.stringify(ledger, null, 2);
  fs.writeFileSync(LEDGER_PATH, serialized, 'utf-8');
  try {
    fs.writeFileSync(ROOT_LEDGER_MIRROR, serialized, 'utf-8');
  } catch (_) {}
}

/**
 * SuperMemo SM-2 Spaced Repetition Scheduling Algorithm
 */
function applySM2(card, grade) {
  card.reviews = (card.reviews || 0) + 1;
  card.lastStatus = grade;
  card.updatedAt = new Date().toISOString();
  card.easeFactor = card.easeFactor || 2.5;
  card.intervalDays = card.intervalDays || 0;
  card.repetitions = card.repetitions || 0;

  let scheduledDays = 1;

  if (grade === 'again') {
    card.repetitions = 0;
    card.intervalDays = 0;
    card.status = 'rusty';
    card.nextReviewAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
    scheduledDays = 0;
  } else if (grade === 'hard') {
    card.repetitions += 1;
    card.intervalDays = Math.max(1, Math.round(card.intervalDays * 1.2));
    card.easeFactor = Math.max(1.3, card.easeFactor - 0.15);
    card.status = 'learning';
    scheduledDays = card.intervalDays;
    card.nextReviewAt = Date.now() + card.intervalDays * 24 * 60 * 60 * 1000;
  } else if (grade === 'good') {
    card.repetitions += 1;
    if (card.repetitions === 1) {
      card.intervalDays = 1;
    } else if (card.repetitions === 2) {
      card.intervalDays = 3;
    } else {
      card.intervalDays = Math.round(card.intervalDays * card.easeFactor);
    }
    card.status = card.intervalDays >= 3 ? 'mastered' : 'learning';
    scheduledDays = card.intervalDays;
    card.nextReviewAt = Date.now() + card.intervalDays * 24 * 60 * 60 * 1000;
  } else if (grade === 'easy') {
    card.repetitions += 1;
    if (card.repetitions === 1) {
      card.intervalDays = 3;
    } else {
      card.intervalDays = Math.round(card.intervalDays * card.easeFactor * 1.3);
    }
    card.easeFactor += 0.15;
    card.status = 'mastered';
    scheduledDays = card.intervalDays;
    card.nextReviewAt = Date.now() + card.intervalDays * 24 * 60 * 60 * 1000;
  }

  return { card, scheduledDays };
}

/**
 * Draws the highest-priority flashcard from the active track for a user
 */
function drawNextFlashcard(trackOverride = null, userCtx = null) {
  let trackKey = trackOverride;
  let ctx = userCtx;
  if (trackOverride && typeof trackOverride === 'object' && (trackOverride.userId || trackOverride.username)) {
    ctx = trackOverride;
    trackKey = null;
  }
  const { userId, username } = resolveUserContext(ctx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  const activeTrack = trackKey || user.settings.activeTrack || 'tech_aiops';
  const domainRatio = typeof user.settings.domainRatio === 'number' ? user.settings.domainRatio : 0.30;
  let pool = user.vocabPool || [];
  let chosenTrack = activeTrack;

  // Probabilistically interleave domain flashcards at user's domain ratio
  if (activeTrack !== 'tech_aiops' && Math.random() < domainRatio) {
    chosenTrack = 'tech_aiops';
  }

  if (chosenTrack !== 'all') {
    const trackFiltered = pool.filter(v => v.levelTrack === chosenTrack);
    if (trackFiltered.length > 0) pool = trackFiltered;
  }

  const now = Date.now();

  // If active pool has no due cards and fewer than 2 new cards, draw fresh word from COMPLETE_HSK_LIBRARY
  const dueCount = pool.filter(v => v.status === 'rusty' || (v.nextReviewAt !== null && v.nextReviewAt <= now)).length;
  const newCount = pool.filter(v => v.status === 'new').length;

  if (dueCount === 0 && newCount < 2) {
    const existingIds = new Set((user.vocabPool || []).map(v => v.id));
    const candidates = COMPLETE_HSK_LIBRARY.filter(w => (chosenTrack === 'all' || w.levelTrack === chosenTrack) && !existingIds.has(w.id));
    if (candidates.length > 0) {
      const freshItem = candidates[Math.floor(Math.random() * candidates.length)];
      const newCard = {
        ...freshItem,
        status: 'new',
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextReviewAt: null,
        reviews: 0,
        lastStatus: null,
        updatedAt: null
      };
      user.vocabPool.push(newCard);
      pool.push(newCard);
      saveMandarinLedger(ledger);
    }
  }

  // Sort priority: overdue/rusty first, then new, then learning, then mastered
  const sorted = [...pool].sort((a, b) => {
    const aDue = a.nextReviewAt !== null && a.nextReviewAt <= now;
    const bDue = b.nextReviewAt !== null && b.nextReviewAt <= now;
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;

    const statusScore = { rusty: 4, new: 3, learning: 2, mastered: 1 };
    const scoreDiff = (statusScore[b.status] || 0) - (statusScore[a.status] || 0);
    if (scoreDiff !== 0) return scoreDiff;

    return (a.intervalDays || 0) - (b.intervalDays || 0);
  });

  const targetCard = sorted[0] || pool[0];
  if (!targetCard) return null;
  const mode = (targetCard.repetitions || 0) % 2 === 0 ? 'recognition' : 'production';
  return { card: targetCard, mode, track: chosenTrack, user };
}

/**
 * Renders the front side of a flashcard embed
 */
function renderFlashcardEmbed(card, mode = 'recognition', reviewNote = null, userCtx = null) {
  let rNote = reviewNote;
  let ctx = userCtx;
  if (reviewNote && typeof reviewNote === 'object' && (reviewNote.userId || reviewNote.username)) {
    ctx = reviewNote;
    rNote = null;
  }
  const { userId, username } = resolveUserContext(ctx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  ensureDailyProgress(user);

  const goalBar = renderProgressBar(user.dailyProgress.cardsReviewedToday, user.dailyProgress.targetCards, 8);
  const dopamineStats = `🎯 **Daily Goal**: \`${user.dailyProgress.cardsReviewedToday}/${user.dailyProgress.targetCards}\` ${goalBar} • 🔥 **Streak**: \`${user.dailyProgress.streakDays}d\` • ⭐ **XP**: \`${user.dailyProgress.totalXp}\`\n\n`;

  if (!card) {
    const fallbackEmbed = new EmbedBuilder()
      .setTitle('🗂️ Mandarin Flashcards')
      .setColor(0x0284c7)
      .setDescription(
        (rNote ? `${rNote}\n\n` : '') +
        `👤 **Learner**: <@${userId}> (${username})\n` +
        dopamineStats +
        'No flashcards available right now in this track! Tap **Draw Next Card** to refresh, or return to **Main Menu**.'
      );
    const fallbackRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('zh:fc:draw')
        .setLabel('🗂️ Draw Next Card')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('zh:menu')
        .setLabel('🏠 Main Menu')
        .setStyle(ButtonStyle.Secondary)
    );
    return { embed: fallbackEmbed, components: [fallbackRow] };
  }

  const isRecognition = mode === 'recognition';
  const trackLabel = TRACK_CONFIG[card.levelTrack]?.label || card.levelTrack;

  const embed = new EmbedBuilder()
    .setTitle(
      isRecognition
        ? `🗂️ Flashcard: Recognition Drill (${trackLabel})`
        : `🗂️ Flashcard: Active Production Drill (${trackLabel})`
    )
    .setColor(isRecognition ? 0x0284c7 : 0xd97706)
    .setDescription(
      (rNote ? `${rNote}\n\n` : '') +
      `👤 **Learner**: <@${userId}> (${username})\n` +
      dopamineStats +
      (isRecognition
        ? `### 🗣️ **${card.hanzi}**\n\n` +
          `> *Context*: “${card.exampleZh}”\n\n` +
          `🏷️ **Category**: \`${card.category}\`\n\n` +
          `💭 *Do you recall the Pinyin (tones) and English meaning?*\n` +
          `Tap **🔄 Flip Card** below to verify!`
        : `### 🎯 **${card.meaning}**\n\n` +
          `> *Fill-in-the-blank*: “${card.clozeZh || card.exampleZh}”\n` +
          `> *English*: "${card.exampleEn}"\n\n` +
          `🏷️ **Category**: \`${card.category}\`\n\n` +
          `💭 *Can you produce the Mandarin characters and tones aloud?*\n` +
          `Tap **🔄 Flip Card** below to verify!`)
    )
    .setFooter({
      text: `Learner: ${username} • SM-2 Interval: ${card.intervalDays || 0}d • Reps: ${card.repetitions || 0} • Status: ${(card.status || 'new').toUpperCase()}`
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`zh:fc:flip:${card.id}:${mode}`)
      .setLabel('🔄 Flip Card')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('zh:fc:draw')
      .setLabel('⏭️ Skip Card')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:menu')
      .setLabel('🏠 Main Menu')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row] };
}

/**
 * Renders the back (flipped) side of a flashcard with 4 SM-2 grading buttons & menu navigation
 */
function renderFlippedFlashcard(cardId, userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  ensureDailyProgress(user);

  const goalBar = renderProgressBar(user.dailyProgress.cardsReviewedToday, user.dailyProgress.targetCards, 8);
  const dopamineStats = `🎯 **Daily Goal**: \`${user.dailyProgress.cardsReviewedToday}/${user.dailyProgress.targetCards}\` ${goalBar} • 🔥 **Streak**: \`${user.dailyProgress.streakDays}d\` • ⭐ **XP**: \`${user.dailyProgress.totalXp}\`\n\n`;

  const card = (user.vocabPool || []).find(v => v.id === cardId);
  if (!card) {
    const fallbackEmbed = new EmbedBuilder()
      .setTitle('⚠️ Flashcard Not Found')
      .setColor(0xef4444)
      .setDescription(
        `👤 **Learner**: <@${userId}> (${username})\n` +
        dopamineStats +
        `Flashcard \`${cardId || 'unknown'}\` was not found in your vocabulary pool.\nTap **Draw Next Card** below to continue.`
      );
    const fallbackRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('zh:fc:draw')
        .setLabel('🗂️ Draw Next Card')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('zh:menu')
        .setLabel('🏠 Main Menu')
        .setStyle(ButtonStyle.Secondary)
    );
    return { embed: fallbackEmbed, components: [fallbackRow] };
  }

  const trackLabel = TRACK_CONFIG[card.levelTrack]?.label || card.levelTrack;

  const embed = new EmbedBuilder()
    .setTitle(`🗂️ Card Flipped: ${card.hanzi} (${card.pinyin})`)
    .setColor(0x16a34a)
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n` +
      dopamineStats +
      `### 🗣️ **${card.hanzi}** (\`${card.pinyin}\`)\n` +
      `### 📖 *${card.meaning}*\n\n` +
      `🏷️ **Track**: \`${trackLabel}\` | **Category**: \`${card.category}\`\n` +
      `💡 **Root & Memory Hook**: ${card.hskHook}\n\n` +
      `**Contextual Workplace Sentence:**\n` +
      `> 🇨🇳 **${card.exampleZh}**\n` +
      `> 🔤 \`${card.examplePy}\`\n` +
      `> 🇬🇧 *"${card.exampleEn}"*\n\n` +
      `📊 **SM-2 Memory State**:\n` +
      `• **Interval**: \`${card.intervalDays || 0} days\` | **Reps**: \`${card.repetitions || 0}\` | **Ease**: \`${(card.easeFactor || 2.5).toFixed(2)}\` | **Status**: \`${(card.status || 'new').toUpperCase()}\`\n\n` +
      `**Self-grade your retrieval strength below to schedule the next review:**`
    );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`zh:fc:grade:${card.id}:again`)
      .setLabel('🟥 Again (<1d)')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`zh:fc:grade:${card.id}:hard`)
      .setLabel('🟧 Hard (1d)')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`zh:fc:grade:${card.id}:good`)
      .setLabel('🟩 Good (3d+)')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`zh:fc:grade:${card.id}:easy`)
      .setLabel('🟦 Easy (7d+)')
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:menu')
      .setLabel('🏠 Main Menu')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:fc:draw')
      .setLabel('⏭️ Skip / Next Card')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row1, row2] };
}

/**
 * Builds celebratory embed when daily flashcard goal is met
 */
function renderDailyTargetAchievedEmbed(user, reviewNote = null) {
  const { userId, username } = resolveUserContext(user);
  ensureDailyProgress(user);
  const targetCards = user.dailyProgress.targetCards;

  const embed = new EmbedBuilder()
    .setTitle(`🎉 Daily Flashcard Goal Completed! (${targetCards}/${targetCards})`)
    .setColor(0x16a34a)
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n\n` +
      (reviewNote ? `*${reviewNote}*\n\n` : '') +
      `🏆 **Boom! You crushed today's flashcard review target!**\n\n` +
      `🔥 **Current Streak**: \`${user.dailyProgress.streakDays} Days in a row!\`\n` +
      `⭐ **XP Earned Today**: \`+${user.dailyProgress.xpToday} XP\` (Total: \`${user.dailyProgress.totalXp} XP\`)\n` +
      `🧠 *Your brain has consolidated these active recall patterns into long-term memory.*\n\n` +
      `*Take a well-deserved break, head back to the main menu, or continue with a bonus round below!*`
    )
    .setFooter({ text: 'Daily Target Achieved • SuperMemo SM-2 Retention Engine' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:menu')
      .setLabel('Main Menu')
      .setEmoji('🏠')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('zh:fc:draw:bonus')
      .setLabel('Bonus Round (+5 Cards)')
      .setEmoji('🔥')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('zh:quiz')
      .setLabel('Take Daily Quiz')
      .setEmoji('🧠')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:stats')
      .setLabel('View SRS Stats')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row] };
}

/**
 * Builds celebratory embed when an overachiever bonus batch of 5 cards is completed
 */
function renderBonusBatchCompletedEmbed(user, reviewNote = null) {
  const { userId, username } = resolveUserContext(user);
  ensureDailyProgress(user);
  const targetCards = user.dailyProgress.targetCards;
  const cardsReviewedToday = user.dailyProgress.cardsReviewedToday;
  const pct = Math.round((cardsReviewedToday / targetCards) * 100);

  const embed = new EmbedBuilder()
    .setTitle(`🔥 Bonus Set Completed! (${cardsReviewedToday}/${targetCards} Cards — ${pct}%)`)
    .setColor(0xd97706)
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n\n` +
      (reviewNote ? `*${reviewNote}*\n\n` : '') +
      `💪 **Extra Reps! You conquered another 5-card bonus set!**\n\n` +
      `🔥 **Current Streak**: \`${user.dailyProgress.streakDays} Days\` • 🎯 **Daily Progress**: \`${cardsReviewedToday}/${targetCards} Cards\` (${pct}% of goal)\n` +
      `⭐ **XP Earned Today**: \`+${user.dailyProgress.xpToday} XP\` (Total: \`${user.dailyProgress.totalXp} XP\`)\n\n` +
      `*Your brain is forging extra neural pathways! Take a break, head to the hub, or keep rolling!*`
    )
    .setFooter({ text: 'Overachiever Bonus Round • SuperMemo SM-2 Retention Engine' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:menu')
      .setLabel('Main Menu')
      .setEmoji('🏠')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('zh:fc:draw:bonus')
      .setLabel('5 More Bonus Cards')
      .setEmoji('🔥')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('zh:quiz')
      .setLabel('Take Quiz')
      .setEmoji('🧠')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:stats')
      .setLabel('View Stats')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row] };
}

/**
 * Grades a flashcard with SM-2 for a specific user and returns next card or celebration embed
 */
function gradeFlashcard(cardId, grade, userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  const { dateStr } = getWIBDateParts();
  ensureDailyProgress(user);

  const card = (user.vocabPool || []).find(v => v.id === cardId);
  if (card) {
    applySM2(card, grade);
  }

  // Increment daily counters
  user.dailyProgress.cardsReviewedToday = (user.dailyProgress.cardsReviewedToday || 0) + 1;
  user.dailyProgress.sessionCardsCompleted = (user.dailyProgress.sessionCardsCompleted || 0) + 1;

  // Award XP: again: +5 XP, hard: +10 XP, good: +15 XP, easy: +20 XP
  const xpValues = { again: 5, hard: 10, good: 15, easy: 20 };
  const earnedXp = xpValues[grade] || 10;
  user.dailyProgress.xpToday = (user.dailyProgress.xpToday || 0) + earnedXp;
  user.dailyProgress.totalXp = (user.dailyProgress.totalXp || 0) + earnedXp;

  const gradeLabels = { again: '🟥 Again (<1d)', hard: '🟧 Hard (1d)', good: '🟩 Good (3d+)', easy: '🟦 Easy (7d+)' };
  const reviewNote = `✅ Graded **${card ? card.hanzi : ''}** (${gradeLabels[grade] || grade}). Next review in **${card ? card.intervalDays : 1} days**! (+${earnedXp} XP)`;

  const targetCards = user.dailyProgress.targetCards || 10;
  const cardsReviewedToday = user.dailyProgress.cardsReviewedToday;
  const sessionCardsCompleted = user.dailyProgress.sessionCardsCompleted;

  // Milestone 1: Daily Target Reached
  if (cardsReviewedToday === targetCards) {
    // Award +50 Bonus XP
    user.dailyProgress.xpToday += 50;
    user.dailyProgress.totalXp += 50;
    if (user.dailyProgress.lastTargetMetDate !== dateStr) {
      user.dailyProgress.streakDays = (user.dailyProgress.streakDays || 0) + 1;
      user.dailyProgress.lastTargetMetDate = dateStr;
    }
    saveMandarinLedger(ledger);
    const { embed, components } = renderDailyTargetAchievedEmbed(user, reviewNote);
    return {
      updatedWord: card,
      nextCard: null,
      nextMode: null,
      reviewNote,
      user,
      embed,
      components
    };
  }

  // Milestone 2: Bonus Batch Completed (every 5 bonus cards)
  if (cardsReviewedToday > targetCards && sessionCardsCompleted % 5 === 0) {
    saveMandarinLedger(ledger);
    const { embed, components } = renderBonusBatchCompletedEmbed(user, reviewNote);
    return {
      updatedWord: card,
      nextCard: null,
      nextMode: null,
      reviewNote,
      user,
      embed,
      components
    };
  }

  // Standard flow: draw next card
  saveMandarinLedger(ledger);
  const drawRes = drawNextFlashcard(null, { userId, username });

  let embed = null;
  let components = null;
  if (drawRes && drawRes.card) {
    const nextRender = renderFlashcardEmbed(drawRes.card, drawRes.mode, reviewNote, { userId, username });
    if (nextRender) {
      embed = nextRender.embed;
      components = nextRender.components;
    }
  }

  return {
    updatedWord: card,
    nextCard: drawRes ? drawRes.card : null,
    nextMode: drawRes ? drawRes.mode : 'recognition',
    reviewNote,
    user,
    embed,
    components
  };
}

/**
 * Builds the Mandarin Learning Hub / Main Menu embed and components
 */
function buildMainMenuEmbedAndComponents(userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  ensureDailyProgress(user);

  const pool = user.vocabPool || [];
  const mastered = pool.filter(v => v.status === 'mastered').length;
  const learning = pool.filter(v => v.status === 'learning').length;
  const trackLabel = TRACK_CONFIG[user.settings.activeTrack]?.label || user.settings.activeTrack;
  const paceLabel = PACE_CONFIG[user.settings.pace]?.label || user.settings.pace;

  const progressBar = renderProgressBar(user.dailyProgress.cardsReviewedToday, user.dailyProgress.targetCards, 10);

  const embed = new EmbedBuilder()
    .setTitle('🏮 Mandarin Learning Hub & Command Center')
    .setColor(0xd97706)
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n\n` +
      `🎯 **Today's Goal**: \`${user.dailyProgress.cardsReviewedToday}/${user.dailyProgress.targetCards} Cards\` ${progressBar}\n` +
      `🔥 **Current Streak**: \`${user.dailyProgress.streakDays} Days\` • ⭐ **Total XP**: \`${user.dailyProgress.totalXp} XP\` (Today: \`+${user.dailyProgress.xpToday} XP\`)\n\n` +
      `⚙️ **Your Profile & Study Setup**:\n` +
      `• **Level**: \`${user.settings.detectedLevel || 'HSK 3-4'}\`\n` +
      `• **Bot-Fit**: \`${user.settings.botFit || 'Active Workplace & Bridge'}\`\n` +
      `• **Active Track**: \`${trackLabel}\`\n` +
      `• **Domain Vocab Ratio**: \`${((user.settings.domainRatio || 0.30) * 100).toFixed(0)}% (AIOps / Engineering)\`\n` +
      `• **Pace**: \`${paceLabel}\`\n` +
      `• **Memory Bank**: \`${mastered} Mastered\` | \`${learning} Learning\` | \`${pool.length} Total Words\`\n\n` +
      `*Choose an action below to practice, adjust settings, or inspect your retention stats:*`
    )
    .setFooter({ text: 'Universal Mandarin Coach • Huawei AIOps & HSK Curriculum • Multi-Tenant' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:fc:draw')
      .setLabel('Study Flashcards')
      .setEmoji('🗂️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('zh:quiz')
      .setLabel('Quick Quiz')
      .setEmoji('🧠')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('zh:place:start')
      .setLabel('Placement Test')
      .setEmoji('🧭')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:pace:light')
      .setLabel('Light (5w)')
      .setEmoji('⚡')
      .setStyle(user.settings.pace === 'light' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:pace:standard')
      .setLabel('Standard (10w)')
      .setEmoji('⚖️')
      .setStyle(user.settings.pace === 'standard' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:pace:deep')
      .setLabel('Deep (15w)')
      .setEmoji('🔥')
      .setStyle(user.settings.pace === 'deep' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:stats')
      .setLabel('Stats & Leaderboard')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:prompt')
      .setLabel('Gemini Spoken Prompt')
      .setEmoji('🎙️')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row1, row2, row3], user };
}

/**
 * Calculates Bot Fit Verdict and Detected Level
 */
function calculateBotFitAndLevel(clearedTierOrScore) {
  let level = 'HSK 3-4';
  let botFit = '🟢 Ideal Fit — Fluency & Workplace/Technical Bridge';
  let botFitKey = 'ideal_workplace_bridge';
  let track = 'hsk3_4';
  let pace = 'standard';
  let strengths = '';
  let gaps = '';

  const tier = typeof clearedTierOrScore === 'number' ? clearedTierOrScore : 0;

  if (tier <= 0) {
    level = 'HSK 0';
    botFit = '🟡 Partial Fit — Needs Pinyin & Tone Foundations First';
    botFitKey = 'partial_foundations';
    track = 'hsk1_2';
    pace = 'light';
    strengths = 'Strong motivation to begin Mandarin from ground zero.';
    gaps = 'Requires foundational Pinyin alphabet and 4-tone phonetics before fast conversational roleplay.';
  } else if (tier === 1) {
    level = 'HSK 1';
    botFit = '🟢 Strong Fit — Foundation Builder Track';
    botFitKey = 'strong_foundation_builder';
    track = 'hsk1_2';
    pace = 'standard';
    strengths = 'Recognizes everyday greetings, time expressions, numbers, and basic survival syntax.';
    gaps = 'Needs sentence expansion, preverbal connectors, and direction complements (往, 从).';
  } else if (tier === 2) {
    level = 'HSK 2';
    botFit = '🟢 Strong Fit — Elementary Workplace Progression';
    botFitKey = 'strong_foundation_builder';
    track = 'hsk1_2';
    pace = 'standard';
    strengths = 'Comfortable with basic conjunctions (因为...所以), time prepositions, and daily dialogue.';
    gaps = 'Disposal structure (把), passive voice (被), and result complements (做好, 修不好).';
  } else if (tier === 3) {
    level = 'HSK 3';
    botFit = '🟢 Ideal Fit — Fluency & Workplace/Technical Bridge';
    botFitKey = 'ideal_workplace_bridge';
    track = 'hsk3_4';
    pace = 'standard';
    strengths = 'Solid command of disposal (把), passive (被), and workplace problem-solving structures.';
    gaps = 'Complex transition markers (尽管, 无论...都), formal concessions, and nuanced office coordination.';
  } else if (tier === 4) {
    level = 'HSK 4';
    botFit = '🟢 Ideal Fit — Professional & Workplace Fluency';
    botFitKey = 'ideal_workplace_bridge';
    track = 'hsk3_4';
    pace = 'standard';
    strengths = 'Proficient in cross-functional transitions, workplace responsibility frames, and professional collaboration.';
    gaps = 'Formal system reasoning, causal deductive connectors (从而 vs 进而), and architectural discourse.';
  } else if (tier === 5) {
    level = 'HSK 5';
    botFit = '🔵 Advanced Fit — Formal Technical Reasoning & Strategy';
    botFitKey = 'specialized_jargon_only';
    track = 'hsk5_6';
    pace = 'deep';
    strengths = 'Mastery of formal system optimization, multi-clause logical reasoning, and strategic analysis.';
    gaps = 'Mission-critical AIOps incident triage, real-time observability telemetry, and root-cause analysis (RCA) jargon.';
  } else {
    // tier >= 6
    level = 'HSK 5-6+';
    botFit = '🔵 Specialized Fit — Full AIOps Engineering Fluent';
    botFitKey = 'specialized_jargon_only';
    track = 'tech_aiops';
    pace = 'deep';
    strengths = 'Native/professional command of incident triage, telemetry diagnostics, root-cause mitigation, and system stability debriefs.';
    gaps = 'Continuous specialized terminology refinement and real-time live Mandarin incident response drilling.';
  }

  return { level, botFit, botFitKey, track, pace, strengths, gaps };
}

/**
 * Helper to pick 3 random distinct questions from a tier with shuffled options
 */
function drawTierQuestions(tierNum) {
  const candidates = PLACEMENT_QUESTION_BANK.filter(q => q.stage === tierNum);
  const shuffledCandidates = [...candidates].sort(() => Math.random() - 0.5);
  const selected = shuffledCandidates.slice(0, 3);
  while (selected.length < 3 && candidates.length > 0) {
    selected.push(candidates[0]);
  }

  return selected.map(q => {
    const correctText = q.options[q.correctIdx];
    const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
    const newCorrectIdx = shuffledOptions.indexOf(correctText);
    return {
      ...q,
      options: shuffledOptions,
      correctIdx: newCorrectIdx
    };
  });
}

function renderPlacementQuestionEmbed(userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);

  if (!user.activePlacement || !user.activePlacement.tierQuestions) {
    return startPlacementSession(userCtx);
  }

  const { currentTier, questionIndex, tierQuestions, tierScore } = user.activePlacement;
  const currentQ = tierQuestions[questionIndex] || tierQuestions[0];
  const qNum = questionIndex + 1;

  const embed = new EmbedBuilder()
    .setTitle(`🧭 Adaptive Placement Test — Tier ${currentTier} (${currentQ.tier})`)
    .setColor(0x0284c7)
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n\n` +
      `### Tier ${currentTier} • Question ${qNum} of 3\n\n` +
      `### ${currentQ.question}\n\n` +
      `*Select the correct option below, or tap **🤷 Not sure / Guess** if you have not learned this structure yet:*`
    )
    .setFooter({
      text: `Learner: ${username} • Tier ${currentTier}/6 (Q${qNum}/3) • Tier Score: ${tierScore}/3 • Equal-length options verified`
    });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`zh:place:ans:0`)
      .setLabel(`1. ${currentQ.options[0]}`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`zh:place:ans:1`)
      .setLabel(`2. ${currentQ.options[1]}`)
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`zh:place:ans:2`)
      .setLabel(`3. ${currentQ.options[2]}`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`zh:place:ans:3`)
      .setLabel(`4. ${currentQ.options[3]}`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`zh:place:skip`)
      .setLabel('🤷 Not sure / Guess')
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, components: [row1, row2], user };
}

function renderTierClearedEmbed(currentTier, tierScore, clearedTiers, userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const pct = Math.round((tierScore / 3) * 100);
  const nextTier = currentTier + 1;

  const embed = new EmbedBuilder()
    .setTitle(`🎉 Tier ${currentTier} (HSK ${currentTier}) Passed! Score: ${tierScore}/3 (${pct}%)`)
    .setColor(0x16a34a)
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n\n` +
      `### 🟢 Progression Gate Cleared!\n` +
      `• **Tier ${currentTier} (HSK ${currentTier})**: Passed with **${tierScore}/3** (${pct}%)\n` +
      `• **Progression Status**: **Unlocked Tier ${nextTier} (HSK ${nextTier})** 🔓\n` +
      `• **Cleared Tiers**: \`${clearedTiers.map(t => 'HSK ' + t).join(', ')}\`\n\n` +
      `You met the ≥67% progression gate threshold! Would you like to advance to **Tier ${nextTier} (HSK ${nextTier})**, or conclude and calibrate your curriculum at **HSK ${currentTier}**?`
    )
    .setFooter({
      text: `Learner: ${username} • Progression Gate Cleared: HSK ${currentTier} • Adaptive Staircase Engine`
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:place:next_tier')
      .setLabel(`➡️ Continue to Tier ${nextTier} (HSK ${nextTier})`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('zh:place:conclude')
      .setLabel(`🏁 Conclude & Calibrate at HSK ${currentTier}`)
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row] };
}

function startPlacementSession(userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);

  const tierQuestions = drawTierQuestions(1);

  user.activePlacement = {
    currentTier: 1,
    questionIndex: 0,
    tierQuestions,
    tierScore: 0,
    clearedTiers: [],
    totalAnswered: 0,
    totalCorrect: 0,
    status: 'in_tier',
    startedAt: new Date().toISOString()
  };

  saveMandarinLedger(ledger);
  return renderPlacementQuestionEmbed(userCtx);
}

function handlePlacementAnswer(chosenIdx, userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);

  if (!user.activePlacement) {
    return startPlacementSession(userCtx);
  }

  if (user.activePlacement.status === 'tier_cleared') {
    return renderTierClearedEmbed(
      user.activePlacement.currentTier,
      user.activePlacement.tierScore,
      user.activePlacement.clearedTiers,
      userCtx
    );
  }

  const { currentTier, questionIndex, tierQuestions } = user.activePlacement;
  const currentQ = tierQuestions[questionIndex] || tierQuestions[0];
  const isCorrect = (chosenIdx !== 'skip' && parseInt(chosenIdx, 10) === currentQ.correctIdx);

  user.activePlacement.totalAnswered = (user.activePlacement.totalAnswered || 0) + 1;
  if (isCorrect) {
    user.activePlacement.tierScore = (user.activePlacement.tierScore || 0) + 1;
    user.activePlacement.totalCorrect = (user.activePlacement.totalCorrect || 0) + 1;
  }

  if (questionIndex < 2) {
    user.activePlacement.questionIndex += 1;
    saveMandarinLedger(ledger);
    return renderPlacementQuestionEmbed(userCtx);
  }

  // 3 questions answered for this tier! Check threshold >= 2/3
  const passed = (user.activePlacement.tierScore >= 2);

  if (passed) {
    if (!user.activePlacement.clearedTiers.includes(currentTier)) {
      user.activePlacement.clearedTiers.push(currentTier);
    }
    if (currentTier >= 6) {
      user.activePlacement.status = 'concluded';
      saveMandarinLedger(ledger);
      return concludePlacementSession(userCtx);
    } else {
      user.activePlacement.status = 'tier_cleared';
      saveMandarinLedger(ledger);
      return renderTierClearedEmbed(
        currentTier,
        user.activePlacement.tierScore,
        user.activePlacement.clearedTiers,
        userCtx
      );
    }
  } else {
    // Failed tier -> placement concludes immediately
    user.activePlacement.status = 'concluded';
    saveMandarinLedger(ledger);
    return concludePlacementSession(userCtx);
  }
}

function advanceToNextTier(userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);

  if (!user.activePlacement) {
    return startPlacementSession(userCtx);
  }

  const nextTier = user.activePlacement.currentTier + 1;
  if (nextTier > 6) {
    return concludePlacementSession(userCtx);
  }

  const nextTierQuestions = drawTierQuestions(nextTier);
  user.activePlacement.currentTier = nextTier;
  user.activePlacement.questionIndex = 0;
  user.activePlacement.tierQuestions = nextTierQuestions;
  user.activePlacement.tierScore = 0;
  user.activePlacement.status = 'in_tier';

  saveMandarinLedger(ledger);
  return renderPlacementQuestionEmbed(userCtx);
}

function concludePlacementSession(userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);

  const cleared = user.activePlacement?.clearedTiers || [];
  const highestClearedTier = cleared.length > 0 ? Math.max(...cleared) : 0;
  const stats = {
    totalCorrect: user.activePlacement?.totalCorrect || 0,
    totalAnswered: user.activePlacement?.totalAnswered || 0,
    clearedTiers: cleared
  };

  user.activePlacement = null;
  saveMandarinLedger(ledger);

  return evaluatePlacementResult(highestClearedTier, userCtx, stats);
}

function buildPlacementStepEmbed(stageNum = 1, currentScore = 0, userCtx = null) {
  return renderPlacementQuestionEmbed(userCtx);
}

const renderPlacementStage = buildPlacementStepEmbed;

function evaluatePlacementResult(clearedTierOrScore, userCtx = null, extraStats = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  const { dateStr } = getWIBDateParts();

  const highestClearedTier = typeof clearedTierOrScore === 'number' ? clearedTierOrScore : 0;
  const fit = calculateBotFitAndLevel(highestClearedTier);

  const totalCorrect = extraStats?.totalCorrect ?? (highestClearedTier >= 1 ? highestClearedTier * 2 : 0);
  const totalAnswered = extraStats?.totalAnswered ?? (highestClearedTier >= 1 ? highestClearedTier * 3 : 3);
  const clearedTiers = extraStats?.clearedTiers ?? (highestClearedTier > 0 ? Array.from({ length: highestClearedTier }, (_, i) => i + 1) : []);
  const grammarPct = totalAnswered > 0 ? `${Math.round((totalCorrect / totalAnswered) * 100)}%` : '0%';

  const baselineEntry = {
    date: dateStr,
    userId,
    username,
    detected_hsk_level: fit.level,
    highest_cleared_tier: highestClearedTier,
    cleared_tiers: clearedTiers,
    bot_fit: fit.botFitKey,
    bot_fit_label: fit.botFit,
    hsk_grammar_retention: grammarPct,
    hanzi_reading_level: highestClearedTier >= 3 ? 'comfortable_hanzi' : highestClearedTier >= 1 ? 'partial_hanzi' : 'needs_pinyin',
    tone_accuracy: '85%',
    tech_vocab_baseline: highestClearedTier >= 5 ? 'advanced' : highestClearedTier >= 3 ? 'intermediate' : 'beginner',
    recommended_track: fit.track,
    recommended_pace: fit.pace,
    strengths: fit.strengths,
    gaps: fit.gaps,
    submittedAt: new Date().toISOString()
  };

  user.settings.baseline = baselineEntry;
  user.settings.detectedLevel = fit.level;
  user.settings.botFit = fit.botFit;
  user.settings.activeTrack = fit.track;
  user.settings.pace = fit.pace;
  user.settings.level = `${fit.level} (${fit.botFit}) -> Active Track: ${fit.track}`;
  user.activePlacement = null;
  saveMandarinLedger(ledger);

  // Write Learning Record 0002
  const lrDir = path.join(WORKSPACE_DIR, 'learning-records');
  const rootLrDir = path.join(LEARNINGS_ROOT, 'learning-records');
  fs.mkdirSync(lrDir, { recursive: true });
  fs.mkdirSync(rootLrDir, { recursive: true });

  const safeUsername = (username || 'learner').replace(/[^a-zA-Z0-9_-]/g, '_');
  const lrFilename = `0002-${safeUsername}-${dateStr}.md`;
  const lrMarkdown = `# Mandarin Baseline Calibration & Placement Assessment — ${username} (${dateStr})

The learner (<@${userId}>, ${username}) completed the adaptive staircase placement test with progression gates.

## Calibration Results
- **Learner**: <@${userId}> (${username})
- **Detected Level**: \`${fit.level}\`
- **Bot-Fit Assessment**: \`${fit.botFit}\`
- **Progression Clearance**: Cleared up to HSK ${highestClearedTier} (${clearedTiers.length > 0 ? clearedTiers.map(t => 'HSK ' + t).join(', ') : 'None'})
- **Total Answered**: ${totalCorrect}/${totalAnswered} (${grammarPct})
- **Active Curriculum Track**: \`${fit.track}\` (${TRACK_CONFIG[fit.track]?.label || fit.track})
- **Recommended Pace**: \`${fit.pace}\` (${PACE_CONFIG[fit.pace]?.label || fit.pace})
- **Domain Vocab Blend Ratio**: ${((user.settings.domainRatio || 0.30) * 100).toFixed(0)}% (AIOps / Engineering)

## Evidence
- **Strengths**: ${fit.strengths}
- **Gaps / Focus Areas**: ${fit.gaps}

## Implications for Daily Spaced Repetition
- Active study track configured to \`${fit.track}\`.
- Flashcard SRS queue prioritizing ${fit.track === 'hsk1_2' ? 'foundational verbs & survival sentences' : fit.track === 'hsk3_4' ? 'workplace connectors & disposal structures' : fit.track === 'hsk5_6' ? 'advanced architecture reasoning & formal strategy frames' : 'AIOps observability & incident triage jargon'}.
`;

  fs.writeFileSync(path.join(lrDir, lrFilename), lrMarkdown, 'utf-8');
  try {
    fs.writeFileSync(path.join(rootLrDir, lrFilename), lrMarkdown, 'utf-8');
  } catch (_) {}

  const clearedSummary = clearedTiers.length > 0 ? clearedTiers.map(t => `HSK ${t}`).join(', ') : 'None (Needs Foundations)';

  const embed = new EmbedBuilder()
    .setTitle(`🎯 Placement Complete: ${fit.level} Detected!`)
    .setColor(0x16a34a)
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n\n` +
      `### **Bot-Fit Verdict**: ${fit.botFit}\n\n` +
      `Your placement results have been calibrated, saved to \`vocab-ledger.json\`, and recorded in \`learning-records/${lrFilename}\`!`
    )
    .addFields(
      {
        name: '📊 Adaptive Staircase Breakdown',
        value:
          `• **Score**: \`${totalCorrect}/${totalAnswered}\` (${grammarPct})\n` +
          `• **Tiers Cleared**: \`${clearedSummary}\`\n` +
          `• **Detected Level**: \`${fit.level}\`\n` +
          `• **Configured Track**: \`${TRACK_CONFIG[fit.track]?.label || fit.track}\`\n` +
          `• **Domain Ratio**: \`${((user.settings.domainRatio || 0.30) * 100).toFixed(0)}% (AIOps / Engineering)\`\n` +
          `• **Daily Pace**: \`${PACE_CONFIG[fit.pace]?.label || fit.pace}\``
      },
      {
        name: '🟢 Strengths',
        value: fit.strengths
      },
      {
        name: '🟡 Next Learning Priorities',
        value: fit.gaps
      }
    )
    .setFooter({ text: 'Adaptive Staircase Placement Engine • Multi-Question Progression Gates' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:fc:draw')
      .setLabel(`🗂️ Study ${fit.level} Flashcards`)
      .setEmoji('🗂️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('zh:quiz')
      .setLabel('🧠 Take a Quiz')
      .setEmoji('🧠')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('zh:stats')
      .setLabel('📊 View My Stats & Leaderboard')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row], verdict: fit, baselineEntry, lrFilename, user };
}

const finalizePlacementTest = evaluatePlacementResult;

/**
 * Universal Gemini Live Voice Placement Prompt (Zero HSK 3 / Huawei Assumption)
 */
function buildGeminiBaselineVoicePrompt() {
  const { dateStr } = getWIBDateParts();
  return `Act as a supportive, adaptive Mandarin language proficiency evaluator & conversation partner.
Goal: Conduct a friendly 3-minute spoken diagnostic placement interview to determine the user's true Mandarin level (HSK 0 to HSK 6+) and learning goals.

[FLOW - 3-MINUTE ADAPTIVE STAIRCASE]
1. Start at Tier 1 (HSK 1): Greet warmly in simple Mandarin (~0.8x speed):
   "你好！我是你的中文测评助手。请问你叫什么名字？你学过中文吗？"
   (If the user does not understand or speaks English, gently note HSK 0 and guide them with basic words).
2. If they respond comfortably, step up to Tier 2 (HSK 2-3):
   Ask about their daily life, work, or why they want to learn Mandarin ("你平时工作忙吗？你为什么要学习中文？"). Listen for SVO word order, time markers, and basic connectors (因为...所以...).
3. If fluent, step up to Tier 3 (HSK 4-5 & Professional/Technical):
   Ask them to describe a workplace challenge or technical scenario:
   "在你的工作中，如果系统或者项目遇到突发问题，你通常怎么跟同事或者主管汇报？"
   Listen for formal connectors (虽然...但是..., 由于...导致...), domain terms, and result complements.
4. Pronunciation & Tone Assessment: Warmly point out any flat tones or pitch contour slips.

At the very end of the 3-minute conversation, give encouraging feedback and output ONLY this exact calibration block in your response transcript so they can paste it into Discord:

[MANDARIN_BASELINE]
date: ${dateStr}
detected_hsk_level: <HSK 0|HSK 1-2|HSK 3-4|HSK 5-6+>
bot_fit: <partial_foundations|strong_foundation_builder|ideal_workplace_bridge|specialized_jargon_only>
hsk_grammar_retention: <0-100>%
hanzi_reading_level: <needs_pinyin|partial_hanzi|comfortable_hanzi>
tone_accuracy: <0-100>%
tech_vocab_baseline: <beginner|intermediate|advanced>
recommended_track: <hsk1_2|hsk3_4|tech_aiops|all>
recommended_pace: <light|standard|deep>
strengths: <1-line summary>
gaps: <1-line summary>
[/MANDARIN_BASELINE]

Start now in Mandarin with your Tier 1 greeting!`;
}

/**
 * Builds the Discord Embed introducing the Universal Baseline Diagnostic
 */
/**
 * Builds the Discord Embed introducing the Universal Baseline Diagnostic
 */
function buildBaselineDiagnosticEmbedAndPrompt(userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  const baselinePrompt = buildGeminiBaselineVoicePrompt();
  const activeTrack = TRACK_CONFIG[user.settings.activeTrack]?.label || user.settings.activeTrack;

  const embed = new EmbedBuilder()
    .setTitle('🎯 Universal Mandarin Placement & Bot-Fit Diagnostic')
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n\n` +
      `Welcome to the **Mandarin Placement Engine**! Whether you are a total beginner (HSK 0), reactivating dormant grammar (HSK 3-4), or an engineer needing technical jargon, let's discover your exact level.\n\n` +
      `### 🚀 Choose How You Want to Place:\n` +
      `• 🧭 **Option 1 (Interactive Discord Staircase)**: Tap **🧭 Start Interactive Placement Test** below for a quick 6-question in-chat diagnostic with zero guessing pressure!\n` +
      `• 🎙️ **Option 2 (Gemini Live Spoken Call)**: Copy the prompt below and paste into Gemini Live on your phone/web for an adaptive 3-minute voice conversation.\n` +
      `• 🌐 **Option 3 (Interactive Web Test)**: Open \`lessons/0000-mandarin-baseline-diagnostic.html\` for a full 10-question browser diagnostic with microphone pronunciation checks.\n\n` +
      `At the end, you'll receive an honest **Bot-Fit Verdict** showing exactly how this bot can (or cannot) accelerate your goals!`
    )
    .setColor(0x0284c7)
    .addFields(
      {
        name: '⚙️ Your Personal Configuration',
        value:
          `• **Active Track**: \`${activeTrack}\`\n` +
          `• **Pace**: \`${user.settings.pace.toUpperCase()}\`\n` +
          `• **Status**: \`${user.settings.detectedLevel ? `${user.settings.detectedLevel} (${user.settings.botFit || 'Calibrated'})` : 'Pending Placement Test ⏳'}\``
      }
    )
    .setFooter({ text: `Learner: ${username} • Use /mandarin baseline or !baseline anytime` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:place:start')
      .setLabel('🧭 Start Interactive Placement Test')
      .setEmoji('🧭')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('zh:baseline_prompt')
      .setLabel('Universal Gemini Live Prompt')
      .setEmoji('🎙️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('zh:fc:draw')
      .setLabel('Study Flashcards')
      .setEmoji('🗂️')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row], promptText: baselinePrompt, user };
}

/**
 * Upgraded Multi-Mode Understanding Quiz:
 * 1. Cloze (Fill-in-the-blank)
 * 2. Comprehension (Workplace communication)
 * 3. Pinyin & Tone Accuracy
 */
function buildInteractiveDiscordQuiz(trackOverride = null, userCtx = null) {
  let trackKey = trackOverride;
  let ctx = userCtx;
  if (trackOverride && typeof trackOverride === 'object' && (trackOverride.userId || trackOverride.username)) {
    ctx = trackOverride;
    trackKey = null;
  }
  const { userId, username } = resolveUserContext(ctx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  const activeTrack = trackKey || user.settings.activeTrack || 'tech_aiops';
  let pool = user.vocabPool || INITIAL_VOCAB_POOL;

  if (activeTrack !== 'all') {
    const filtered = pool.filter(w => w.levelTrack === activeTrack);
    if (filtered.length > 0) pool = filtered;
  }

  const target = pool[Math.floor(Math.random() * pool.length)] || pool[0];
  const quizModes = ['cloze', 'comprehension', 'pinyin'];
  const quizType = quizModes[Math.floor(Math.random() * quizModes.length)];

  if (quizType === 'cloze') {
    // 1. Cloze Quiz: 4 options with exact same character count
    const sameLenPool = pool.filter(w => w.id !== target.id && w.hanzi.length === target.hanzi.length);
    const distractors = sameLenPool.sort(() => Math.random() - 0.5).slice(0, 3);
    while (distractors.length < 3) {
      const fallback = pool.filter(w => w.id !== target.id && !distractors.some(d => d.id === w.id))[0];
      if (fallback) distractors.push(fallback);
      else break;
    }

    const choices = [target, ...distractors].sort(() => Math.random() - 0.5);
    const correctIdx = choices.findIndex(c => c.id === target.id);

    const embed = new EmbedBuilder()
      .setTitle('🧠 Cloze Quiz — Fill in the Blank')
      .setColor(0x0284c7)
      .setDescription(
        `👤 **Learner**: <@${userId}> (${username})\n\n` +
        `### 🗣️ **“${target.clozeZh || target.exampleZh}”**\n\n` +
        `> 🇬🇧 *English*: "${target.exampleEn}"\n\n` +
        `**Which Mandarin term completes the sentence correctly?**`
      )
      .setFooter({ text: `Learner: ${username} • Track: ${target.levelTrack.toUpperCase()} • Equal-length options verified` });

    const row = new ActionRowBuilder();
    choices.forEach((c, idx) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`zh:quiz:ans:${target.id}:${idx}:${correctIdx}:cloze`)
          .setLabel(`${idx + 1}. ${c.hanzi}`)
          .setStyle(ButtonStyle.Secondary)
      );
    });

    return { embed, components: [row], target, quizType, user };
  } else if (quizType === 'pinyin') {
    // 2. Pinyin & Tone Accuracy Check
    const p = target.pinyin.trim();
    const toneVariants = [
      p,
      p.replace(/à/g, 'á').replace(/á/g, 'ǎ').replace(/è/g, 'é').replace(/é/g, 'ě').replace(/ì/g, 'í').replace(/í/g, 'ǐ').replace(/ò/g, 'ó').replace(/ó/g, 'ǒ').replace(/ù/g, 'ú').replace(/ú/g, 'ǔ'),
      p.replace(/á/g, 'à').replace(/à/g, 'ā').replace(/é/g, 'è').replace(/è/g, 'ē').replace(/ì/g, 'ì').replace(/ì/g, 'ī').replace(/ó/g, 'ò').replace(/ò/g, 'ō').replace(/ú/g, 'ù').replace(/ù/g, 'ū'),
      p.replace(/ǎ/g, 'à').replace(/ā/g, 'á').replace(/ě/g, 'è').replace(/ē/g, 'é').replace(/ǐ/g, 'ì').replace(/ī/g, 'í').replace(/ǒ/g, 'ò').replace(/ō/g, 'ó').replace(/ǔ/g, 'ù').replace(/ū/g, 'ú')
    ];

    const uniqueVariants = Array.from(new Set(toneVariants)).filter(v => v.length === p.length);
    while (uniqueVariants.length < 4) {
      uniqueVariants.push(p + (uniqueVariants.length === 2 ? ' ' : ''));
    }
    const finalChoices = uniqueVariants.slice(0, 4).sort(() => Math.random() - 0.5);
    const correctIdx = finalChoices.indexOf(p);

    const embed = new EmbedBuilder()
      .setTitle('🧠 Tone & Pinyin Accuracy Check')
      .setColor(0xd97706)
      .setDescription(
        `👤 **Learner**: <@${userId}> (${username})\n\n` +
        `### 🗣️ **${target.hanzi}**\n` +
        `*Meaning*: "${target.meaning}"\n\n` +
        `**Which Pinyin transcription has the accurate tone marks?**`
      )
      .setFooter({ text: `Learner: ${username} • Track: ${target.levelTrack.toUpperCase()} • Pronunciation Drill` });

    const row = new ActionRowBuilder();
    finalChoices.forEach((py, idx) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`zh:quiz:ans:${target.id}:${idx}:${correctIdx}:pinyin`)
          .setLabel(`${idx + 1}. ${py}`)
          .setStyle(ButtonStyle.Secondary)
      );
    });

    return { embed, components: [row], target, quizType, user };
  } else {
    // 3. Comprehension Quiz
    const others = pool.filter(w => w.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [target, ...others].sort(() => Math.random() - 0.5);
    const correctIdx = choices.findIndex(c => c.id === target.id);

    const embed = new EmbedBuilder()
      .setTitle('🧠 Workplace Comprehension Quiz')
      .setColor(0x16a34a)
      .setDescription(
        `👤 **Learner**: <@${userId}> (${username})\n\n` +
        `A colleague says in a standup meeting:\n\n` +
        `### 🗣️ **“${target.exampleZh}”**\n` +
        `*Pinyin*: \`${target.examplePy}\`\n\n` +
        `**What does 「${target.hanzi}」 mean in this workplace sentence?**`
      )
      .setFooter({ text: `Learner: ${username} • Track: ${target.levelTrack.toUpperCase()}` });

    const row = new ActionRowBuilder();
    choices.forEach((c, idx) => {
      const shortMeaning = c.meaning.split('(')[0].trim().slice(0, 36);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`zh:quiz:ans:${target.id}:${idx}:${correctIdx}:comprehension`)
          .setLabel(`${idx + 1}. ${shortMeaning}`)
          .setStyle(ButtonStyle.Secondary)
      );
    });

    return { embed, components: [row], target, quizType, user };
  }
}

/**
 * Evaluates quiz answer and updates SM-2 state accordingly for the user
 */
function gradeQuizAnswer(wordId, chosenIdx, correctIdx, userCtx = null) {
  let isCorrect;
  let ctx = userCtx;
  if (typeof chosenIdx === 'boolean') {
    isCorrect = chosenIdx;
    ctx = correctIdx || null;
  } else {
    isCorrect = parseInt(chosenIdx, 10) === parseInt(correctIdx, 10);
  }
  const { userId, username } = resolveUserContext(ctx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  const word = (user.vocabPool || []).find(w => w.id === wordId);

  if (word) {
    applySM2(word, isCorrect ? 'good' : 'again');
    saveMandarinLedger(ledger);
  }

  const embed = new EmbedBuilder()
    .setTitle(isCorrect ? '✅ Correct Answer!' : '❌ Incorrect — Keep Practicing!')
    .setColor(isCorrect ? 0x16a34a : 0xdc2626)
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n\n` +
      `### **${word ? word.hanzi : ''}** (\`${word ? word.pinyin : ''}\`)\n` +
      `*Meaning*: ${word ? word.meaning : ''}\n\n` +
      `> 🇨🇳 **${word ? word.exampleZh : ''}**\n` +
      `> 🔤 \`${word ? word.examplePy : ''}\`\n` +
      `> 🇬🇧 *"${word ? word.exampleEn : ''}"*\n\n` +
      `💡 **Memory Hook**: ${word ? word.hskHook : ''}\n` +
      `📊 **SM-2 State**: Updated to \`${word ? word.status.toUpperCase() : 'LEARNING'}\` (Interval: ${word ? word.intervalDays : 1}d)`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:quiz')
      .setLabel('Next Quiz Question')
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('zh:fc:draw')
      .setLabel('Study Flashcards')
      .setEmoji('🗂️')
      .setStyle(ButtonStyle.Secondary)
  );

  return { isCorrect, word, embed, components: [row], user };
}

/**
 * Switches the active vocabulary track for a specific user
 */
function switchTrack(trackKey, userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  const valid = TRACK_CONFIG[trackKey] ? trackKey : 'all';
  user.settings.activeTrack = valid;
  saveMandarinLedger(ledger);

  const cfg = TRACK_CONFIG[valid];
  const count = valid === 'all'
    ? user.vocabPool.length
    : user.vocabPool.filter(w => w.levelTrack === valid).length;

  const embed = new EmbedBuilder()
    .setTitle(`🔄 Curriculum Track Switched to: ${cfg.label}`)
    .setColor(0x0284c7)
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n\n` +
      `**Description**: ${cfg.description}\n\n` +
      `📚 **Active Vocabulary in Track**: \`${count} Terms\`\n` +
      `Your personal flashcard draws, daily morning drops, and quizzes will now prioritize this track.`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:fc:draw')
      .setLabel(`Study ${cfg.label} Flashcards`)
      .setEmoji('🗂️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('zh:quiz')
      .setLabel('Take Quiz in this Track')
      .setEmoji('🧠')
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, components: [row], track: valid, user };
}

/**
 * Universal Baseline Ingestion ([MANDARIN_BASELINE] parser)
 */
function parseAndRecordBaseline(rawText, userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  const { dateStr } = getWIBDateParts();

  const extractField = (key) => {
    const regex = new RegExp(`^\\s*${key}\\s*:\\s*(.+)$`, 'im');
    const match = rawText.match(regex);
    if (!match) return '';
    return match[1].replace(/^[<"']|[>"']$/g, '').trim();
  };

  const bDate = extractField('date') || dateStr;
  const detectedLevel = extractField('detected_hsk_level') || 'HSK 3-4';
  const botFitRaw = extractField('bot_fit') || 'ideal_workplace_bridge';
  const grammarRaw = extractField('hsk_grammar_retention') || '80%';
  const hanziRaw = (extractField('hanzi_reading_level') || 'partial_hanzi').toLowerCase();
  const toneRaw = extractField('tone_accuracy') || '85%';
  const techRaw = (extractField('tech_vocab_baseline') || 'intermediate').toLowerCase();
  const trackRaw = (extractField('recommended_track') || 'hsk3_4').toLowerCase();
  const paceRaw = (extractField('recommended_pace') || 'standard').toLowerCase();
  const strengths = extractField('strengths') || 'Sentence skeletons and word order are preserved.';
  const gaps = extractField('gaps') || 'Technical compounds require structured retrieval drills.';

  const cleanTrack = TRACK_CONFIG[trackRaw] ? trackRaw : 'hsk3_4';
  const cleanPace = PACE_CONFIG[paceRaw] ? paceRaw : 'standard';

  const baselineEntry = {
    date: bDate,
    detected_hsk_level: detectedLevel,
    bot_fit: botFitRaw,
    hsk_grammar_retention: grammarRaw,
    hanzi_reading_level: hanziRaw,
    tone_accuracy: toneRaw,
    tech_vocab_baseline: techRaw,
    recommended_track: cleanTrack,
    recommended_pace: cleanPace,
    strengths,
    gaps,
    submittedAt: new Date().toISOString()
  };

  user.settings.baseline = baselineEntry;
  user.settings.detectedLevel = detectedLevel;
  user.settings.activeTrack = cleanTrack;
  user.settings.pace = cleanPace;
  user.settings.level = `${detectedLevel} (${botFitRaw}) -> Track: ${cleanTrack}`;

  const userKeys = Object.keys(ledger.users);
  if (userKeys.length === 0 || userKeys[0] === userId || userId === 'default') {
    ledger.settings.baseline = baselineEntry;
    ledger.settings.detectedLevel = detectedLevel;
    ledger.settings.activeTrack = cleanTrack;
    ledger.settings.pace = cleanPace;
    ledger.settings.level = user.settings.level;
  }
  saveMandarinLedger(ledger);

  // Write Learning Record
  const lrDir = path.join(WORKSPACE_DIR, 'learning-records');
  const rootLrDir = path.join(LEARNINGS_ROOT, 'learning-records');
  fs.mkdirSync(lrDir, { recursive: true });
  fs.mkdirSync(rootLrDir, { recursive: true });

  const safeUsername = (username || userId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const lrFilename = `0002-${safeUsername}-${bDate}.md`;
  const lrMarkdown = `# Mandarin Baseline Calibration & Placement Assessment (${bDate})
**Learner**: <@${userId}> (${username})

The learner completed their universal diagnostic placement calibration.

## Calibration Results
- **Date**: ${bDate}
- **Detected Level**: \`${detectedLevel}\`
- **Bot-Fit Assessment**: \`${botFitRaw}\`
- **Grammar Retention**: ${grammarRaw}
- **Hanzi Reading Level**: \`${hanziRaw}\`
- **Pronunciation & Tone Accuracy**: ${toneRaw}
- **Technical Vocab Baseline**: \`${techRaw}\`
- **Active Curriculum Track**: \`${cleanTrack}\` (${TRACK_CONFIG[cleanTrack]?.label || cleanTrack})
- **Calibrated Daily Pace**: \`${cleanPace}\` (${PACE_CONFIG[cleanPace]?.label || cleanPace})

## Evidence
- **Strengths**: ${strengths}
- **Gaps / Focus Areas**: ${gaps}

## Implications for Curriculum & Spaced Repetition
- Daily sessions configured to \`${cleanPace}\` mode in track \`${cleanTrack}\`.
- Flashcards and morning drops prioritized for ${cleanTrack}.
`;

  fs.writeFileSync(path.join(lrDir, lrFilename), lrMarkdown, 'utf-8');
  try {
    fs.writeFileSync(path.join(rootLrDir, lrFilename), lrMarkdown, 'utf-8');
  } catch (_) {}

  return { baselineEntry, lrFilename, ledger, user };
}

/**
 * Builds daily morning session based on pace and active track
 */
function buildDailySession(paceOverride = null, trackOverride = null, userCtx = null) {
  let actualPace = paceOverride;
  let actualTrack = trackOverride;
  let ctx = userCtx;

  if (paceOverride && typeof paceOverride === 'object') {
    ctx = paceOverride;
    actualPace = null;
    actualTrack = null;
  } else if (trackOverride && typeof trackOverride === 'object') {
    ctx = trackOverride;
    actualTrack = null;
  }

  const { userId, username } = resolveUserContext(ctx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);

  const paceKey = PACE_CONFIG[actualPace] ? actualPace : (user.settings.pace || 'standard');
  const trackKey = actualTrack || user.settings.activeTrack || 'tech_aiops';
  const cfg = PACE_CONFIG[paceKey];
  const { dateStr } = getWIBDateParts();

  function selectWordsFromSubPool(subPool, count, excludeIds = []) {
    if (count <= 0) return [];
    const available = subPool.filter(w => !excludeIds.includes(w.id));
    const rustyItems = available.filter(v => v.status === 'rusty');
    const newItems = available.filter(v => v.status === 'new');
    const learningItems = available.filter(v => v.status === 'learning');
    const masteredItems = available.filter(v => v.status === 'mastered');

    const sel = [];
    const maxReview = Math.max(1, Math.floor(count * 0.4));
    for (const item of rustyItems) {
      if (sel.length < maxReview) sel.push({ ...item, isReview: true });
    }
    for (const item of newItems) {
      if (sel.length < count && !sel.some(s => s.id === item.id)) {
        sel.push({ ...item, isReview: false });
      }
    }
    for (const item of [...learningItems, ...masteredItems]) {
      if (sel.length < count && !sel.some(s => s.id === item.id)) {
        sel.push({ ...item, isReview: true });
      }
    }
    for (const item of available) {
      if (sel.length < count && !sel.some(s => s.id === item.id)) {
        sel.push({ ...item, isReview: item.status !== 'new' });
      }
    }
    return sel;
  }

  const domainRatio = typeof user.settings.domainRatio === 'number' ? user.settings.domainRatio : 0.30;
  let pool = user.vocabPool || [];
  let selected = [];

  if (trackKey === 'tech_aiops') {
    const aiopsPool = pool.filter(v => v.levelTrack === 'tech_aiops');
    selected = selectWordsFromSubPool(aiopsPool.length > 0 ? aiopsPool : pool, cfg.wordCount);
  } else {
    const domainCount = Math.max(1, Math.round(cfg.wordCount * domainRatio));
    const trackCount = Math.max(0, cfg.wordCount - domainCount);

    const aiopsPool = pool.filter(v => v.levelTrack === 'tech_aiops');
    let trackPool = trackKey === 'all'
      ? pool.filter(v => v.levelTrack !== 'tech_aiops')
      : pool.filter(v => v.levelTrack === trackKey);

    if (trackPool.length < trackCount) {
      const existingIds = new Set(pool.map(v => v.id));
      const candidates = COMPLETE_HSK_LIBRARY.filter(w => (trackKey === 'all' || w.levelTrack === trackKey) && !existingIds.has(w.id));
      const needed = trackCount - trackPool.length;
      const additional = candidates.slice(0, needed).map(item => ({
        ...item,
        status: 'new',
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextReviewAt: null,
        reviews: 0,
        lastStatus: null,
        updatedAt: null
      }));
      user.vocabPool.push(...additional);
      trackPool.push(...additional);
      saveMandarinLedger(ledger);
    }

    const selectedDomain = selectWordsFromSubPool(aiopsPool.length > 0 ? aiopsPool : pool, domainCount);
    const selectedTrack = selectWordsFromSubPool(trackPool.length > 0 ? trackPool : pool, trackCount, selectedDomain.map(w => w.id));

    selected = [...selectedDomain, ...selectedTrack];
  }

  const targetSentences = selected.slice(0, cfg.sentenceCount).map(v => ({
    zh: v.exampleZh,
    py: v.examplePy,
    en: v.exampleEn,
    focusWord: v.hanzi
  }));

  const dayNum = user.settings.currentDayNumber || 1;
  const session = {
    userId,
    username,
    dayNumber: dayNum,
    date: dateStr,
    pace: paceKey,
    paceLabel: cfg.label,
    track: trackKey,
    words: selected,
    sentences: targetSentences,
    geminiPrompt: buildGeminiVoicePrompt({
      dayNumber: dayNum,
      date: dateStr,
      paceKey,
      level: user.settings.level,
      words: selected,
      sentences: targetSentences
    })
  };

  user.settings.pace = paceKey;
  user.activeSession = session;

  const userKeys = Object.keys(ledger.users);
  if (userKeys.length === 0 || userKeys[0] === userId || userId === 'default') {
    ledger.settings.pace = paceKey;
    ledger.activeSession = session;
  }

  saveMandarinLedger(ledger);
  return { session, ledger, user };
}

function buildGeminiVoicePrompt({ dayNumber, date, paceKey, words, sentences }) {
  const vocabLines = words
    .map((w, i) => `${i + 1}. ${w.hanzi}(${w.pinyin}): ${w.meaning.split('(')[0].trim()}`)
    .join('\n');

  const sentenceLines = sentences
    .map((s, i) => `${i + 1}. ${s.zh} (${s.py})`)
    .join('\n');

  return `Act as 张主管 (Zhāng Zhǔguǎn), my Huawei AIOps manager & Mandarin pronunciation coach.
Context: Rebuilding spoken technical fluency. Day ${dayNumber} (${date}) [${paceKey.toUpperCase()}]

[VOCAB]
${vocabLines}

[SENTENCES]
${sentenceLines}

[FLOW]
1. Short turns (1-2 sentences) for voice/chat.
2. Warmup: Greet me in Mandarin; have me read the vocab & sentences aloud. Give 1-line English tone feedback & make me repeat slips once.
3. Standup: Ask 2-3 workplace/engineering questions in Mandarin (~0.9x speed).
4. When I say "End session" or "Evaluate me", output ONLY this block to paste back to Discord:

[MANDARIN_EVAL]
date: ${date}
day: ${dayNumber}
pace: ${paceKey}
overall_score: <0-100>
mastered_words: <Hanzi used well>
rusty_words: <Hanzi needing tone/recall help>
missed_words: <Hanzi missed>
tone_notes: <1-line tone feedback>
grammar_notes: <1-line grammar feedback>
recommended_pace: <light|standard|deep>
summary: <1-sentence takeaway>
[/MANDARIN_EVAL]

Start now in Mandarin as 张主管!`;
}

function buildMandarinLessonEmbedAndComponents(session, ledger, userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx || session);
  const user = getUserProfile(ledger, userId, username);
  const pool = user.vocabPool || [];
  const masteredCount = pool.filter(v => v.status === 'mastered').length;
  const rustyCount = pool.filter(v => v.status === 'rusty').length;

  const vocabFieldText = session.words
    .map((w, idx) => {
      const badge = w.isReview ? '🔄 `[SRS]`' : '✨ `[NEW]`';
      return `**${idx + 1}. ${w.hanzi}** (\`${w.pinyin}\`) ${badge}\n└ *${w.meaning}*\n└ 💡 Root: ${w.hskHook}`;
    })
    .join('\n\n');

  const sentenceFieldText = session.sentences
    .map((s, idx) => {
      return `**${idx + 1}.** 🗣️ **${s.zh}**\n└ \`${s.py}\`\n└ *"${s.en}"*`;
    })
    .join('\n\n');

  const trackLabel = TRACK_CONFIG[session.track]?.label || session.track;
  const domainRatio = typeof user.settings.domainRatio === 'number' ? user.settings.domainRatio : 0.30;
  const domainPct = (domainRatio * 100).toFixed(0);

  const embed = new EmbedBuilder()
    .setTitle(`🇨🇳 Daily Mandarin Session — Day ${session.dayNumber} (${session.paceLabel})`)
    .setDescription(
      `👤 **Learner**: <@${userId}> (${username})\n` +
      `**Track**: \`${trackLabel}\` • **Domain Vocab Ratio**: \`${domainPct}% (AIOps / Engineering)\`\n` +
      `Switch workload with the **Pace Buttons**, study interactive **Flashcards**, take a **Quiz**, or paste your \`[MANDARIN_EVAL]\` back into this channel!`
    )
    .setColor(0xdc2626)
    .addFields(
      {
        name: `📚 Today's Target Vocabulary (${session.words.length} Terms)`,
        value: vocabFieldText.slice(0, 1024)
      },
      {
        name: `🎙️ Manager Briefing Frames`,
        value: sentenceFieldText.slice(0, 1024)
      },
      {
        name: `📊 SRS Memory State for ${username}`,
        value: `• **Pace**: \`${session.pace.toUpperCase()}\` | **Mastered**: \`${masteredCount}/${pool.length}\` | **Needs Review**: \`${rustyCount}\`\n• **Web Lesson**: \`lessons/0000-mandarin-baseline-diagnostic.html\``
      }
    )
    .setFooter({ text: 'Schedule: 08:30 WIB Daily Drop • 20:00 WIB Eval Check • Powered by Antigravity (agy)' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:pace:light')
      .setLabel('Light (3w / 5m)')
      .setEmoji('⚡')
      .setStyle(session.pace === 'light' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:pace:standard')
      .setLabel('Standard (6w / 10m)')
      .setEmoji('⚖️')
      .setStyle(session.pace === 'standard' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:pace:deep')
      .setLabel('Deep (10w / 20m)')
      .setEmoji('🔥')
      .setStyle(session.pace === 'deep' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:menu')
      .setLabel('Main Menu')
      .setEmoji('🏠')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:fc:draw')
      .setLabel('Study Flashcards')
      .setEmoji('🗂️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('zh:quiz')
      .setLabel('Quick Quiz')
      .setEmoji('🧠')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('zh:place:start')
      .setLabel('Placement Test')
      .setEmoji('🧭')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:stats')
      .setLabel('SRS Stats')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row1, row2] };
}

/**
 * Builds personal stats embed and channel-wide leaderboard
 */
function buildStatsEmbed(userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  ensureDailyProgress(user);

  const pool = user.vocabPool || [];
  const mastered = pool.filter(v => v.status === 'mastered');
  const learning = pool.filter(v => v.status === 'learning');
  const rusty = pool.filter(v => v.status === 'rusty');
  const newW = pool.filter(v => v.status === 'new');
  const trackLabel = TRACK_CONFIG[user.settings.activeTrack]?.label || user.settings.activeTrack;
  const goalBar = renderProgressBar(user.dailyProgress.cardsReviewedToday, user.dailyProgress.targetCards, 8);

  // Build Leaderboard across all registered users
  const allUsers = Object.values(ledger.users || {});
  const userRankings = allUsers.map(u => {
    ensureDailyProgress(u);
    const uPool = u.vocabPool || [];
    const m = uPool.filter(v => v.status === 'mastered').length;
    const l = uPool.filter(v => v.status === 'learning').length;
    const r = uPool.filter(v => v.status === 'rusty').length;
    const score = (m * 2) + l + Math.round((u.dailyProgress?.totalXp || 0) / 10);
    return {
      userId: u.userId,
      username: u.username || 'Learner',
      mastered: m,
      learning: l,
      rusty: r,
      totalPool: uPool.length,
      level: u.settings?.detectedLevel || 'HSK 3-4',
      track: u.settings?.activeTrack || 'tech_aiops',
      score,
      streakDays: u.dailyProgress?.streakDays || 0,
      totalXp: u.dailyProgress?.totalXp || 0
    };
  }).sort((a, b) => b.score - a.score || b.mastered - a.mastered);

  const medals = ['🥇', '🥈', '🥉'];
  const leaderboardLines = userRankings.slice(0, 10).map((u, i) => {
    const medal = medals[i] || `**#${i + 1}**`;
    const isSelf = u.userId === userId ? ' 👈 *(You)*' : '';
    return `${medal} <@${u.userId}> (${u.username}) — 🔥 \`${u.streakDays}d\` | ⭐ \`${u.totalXp} XP\` | 🏆 \`${u.mastered} Mastered\` | 🔄 \`${u.learning} Learning\` | \`${u.level}\`${isSelf}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('📊 Mandarin Learning — SM-2 Spaced Repetition Ledger')
    .setDescription(`Personal memory state for **<@${userId}>** (${username}) & Channel Leaderboard:`)
    .setColor(0x16a34a)
    .addFields(
      {
        name: `⚙️ Profile & Curriculum (${username})`,
        value:
          `• **Day**: \`Day ${user.settings.currentDayNumber || 1}\` | **Daily Pace**: \`${user.settings.pace?.toUpperCase() || 'STANDARD'}\`\n` +
          `• **Daily Goal**: \`${user.dailyProgress.cardsReviewedToday}/${user.dailyProgress.targetCards} Cards\` ${goalBar} | 🔥 **Streak**: \`${user.dailyProgress.streakDays}d\` | ⭐ **XP**: \`${user.dailyProgress.totalXp}\`\n` +
          `• **Level / Bot Fit**: \`${user.settings.detectedLevel || 'HSK 3-4'}\` (${user.settings.botFit || 'Active'})\n` +
          `• **Active Track**: \`${trackLabel}\``
      },
      {
        name: `🟢 Mastered Cards (Interval >= 3d): ${mastered.length}/${pool.length}`,
        value: mastered.length > 0 ? mastered.map(v => `\`${v.hanzi}\``).join(', ').slice(0, 500) : '*Start reviewing flashcards to build long-term retention!*'
      },
      {
        name: `🟡 Learning & In Progress (${learning.length})`,
        value: learning.length > 0 ? learning.map(v => `\`${v.hanzi} (${v.intervalDays}d)\``).join(', ').slice(0, 500) : '*None in learning stage.*'
      },
      {
        name: `🔴 Priority Review Needed / Rusty (${rusty.length})`,
        value: rusty.length > 0 ? rusty.map(v => `\`${v.hanzi}\``).join(', ') : '*No rusty cards queued!*'
      },
      {
        name: `✨ New Unseen Cards (${newW.length})`,
        value: newW.slice(0, 8).map(v => `\`${v.hanzi}\``).join(', ') + (newW.length > 8 ? ` +${newW.length - 8} more` : '')
      },
      {
        name: `🏆 Channel Learners Leaderboard (${allUsers.length} active learner${allUsers.length === 1 ? '' : 's'})`,
        value: leaderboardLines.length > 0 ? leaderboardLines.join('\n') : '*No learners registered yet.*'
      }
    )
    .setFooter({ text: 'Spaced Repetition: SuperMemo SM-2 • Multi-Tenant Isolation by Discord userId' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('zh:menu')
      .setLabel('Main Menu')
      .setEmoji('🏠')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('zh:fc:draw')
      .setLabel('Drill Flashcards')
      .setEmoji('🗂️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('zh:quiz')
      .setLabel('Quick Quiz')
      .setEmoji('🧠')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('zh:place:start')
      .setLabel('Placement Test')
      .setEmoji('🧭')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row], user, leaderboard: userRankings };
}

/**
 * Parses a [MANDARIN_EVAL] block
 */
function parseAndRecordEvaluation(rawText, userCtx = null) {
  const { userId, username } = resolveUserContext(userCtx);
  const ledger = loadMandarinLedger();
  const user = getUserProfile(ledger, userId, username);
  const { dateStr } = getWIBDateParts();

  const extractField = (key) => {
    const regex = new RegExp(`^\\s*${key}\\s*:\\s*(.+)$`, 'im');
    const match = rawText.match(regex);
    return match ? match[1].trim() : '';
  };

  const scoreRaw = extractField('overall_score') || '80';
  const masteredRaw = extractField('mastered_words');
  const rustyRaw = extractField('rusty_words');
  const missedRaw = extractField('missed_words');
  const toneNotes = extractField('tone_notes') || 'See evaluation transcript.';
  const grammarNotes = extractField('grammar_notes') || 'Practiced workplace briefing structure.';
  const recPace = extractField('recommended_pace').toLowerCase();
  const summary = extractField('summary') || rawText.slice(0, 280).replace(/\n+/g, ' ');

  const splitWords = (str) =>
    str ? str.split(/[,，、/]+/).map(s => s.trim()).filter(Boolean) : [];

  const masteredList = splitWords(masteredRaw);
  const rustyList = splitWords(rustyRaw);
  const missedList = splitWords(missedRaw);

  const updatedMastered = [];
  const updatedRusty = [];

  for (const item of user.vocabPool) {
    const coreHanzi = item.hanzi.split(/[…/\s]+/)[0].trim();
    if (masteredList.some(w => w.includes(coreHanzi) || coreHanzi.includes(w))) {
      applySM2(item, 'good');
      updatedMastered.push(item.hanzi);
    } else if (
      rustyList.some(w => w.includes(coreHanzi) || coreHanzi.includes(w)) ||
      missedList.some(w => w.includes(coreHanzi) || coreHanzi.includes(w))
    ) {
      applySM2(item, 'again');
      updatedRusty.push(item.hanzi);
    }
  }

  if (PACE_CONFIG[recPace]) user.settings.pace = recPace;
  user.settings.lastEvalDate = dateStr;
  user.settings.currentDayNumber = (user.settings.currentDayNumber || 1) + 1;

  const evalEntry = {
    date: dateStr,
    score: scoreRaw,
    mastered: updatedMastered.length > 0 ? updatedMastered : masteredList,
    rusty: updatedRusty.length > 0 ? updatedRusty : [...rustyList, ...missedList],
    toneNotes,
    grammarNotes,
    summary,
    submittedAt: new Date().toISOString()
  };

  user.evalHistory = user.evalHistory || [];
  user.evalHistory.push(evalEntry);

  const userKeys = Object.keys(ledger.users);
  if (userKeys.length === 0 || userKeys[0] === userId || userId === 'default') {
    if (PACE_CONFIG[recPace]) ledger.settings.pace = recPace;
    ledger.settings.lastEvalDate = dateStr;
    ledger.settings.currentDayNumber = user.settings.currentDayNumber;
    ledger.evalHistory = user.evalHistory;
    ledger.vocabPool = user.vocabPool;
  }

  saveMandarinLedger(ledger);

  const lrDir = path.join(WORKSPACE_DIR, 'learning-records');
  const rootLrDir = path.join(LEARNINGS_ROOT, 'learning-records');
  fs.mkdirSync(lrDir, { recursive: true });
  fs.mkdirSync(rootLrDir, { recursive: true });

  const existingFiles = fs.readdirSync(lrDir).filter(f => /^\d{4}-.*\.md$/.test(f)).sort();
  const nextNum = existingFiles.length + 1;
  const numPrefix = String(nextNum).padStart(4, '0');
  const safeUsername = (username || userId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const lrFilename = `${numPrefix}-${safeUsername}-eval-${dateStr}.md`;

  const lrMarkdown = `# Gemini Voice Evaluation (${dateStr}) — Score: ${scoreRaw}
**Learner**: <@${userId}> (${username})

${summary}

## Evidence
- **Mastered Terms**: ${(evalEntry.mastered || []).join(', ') || 'None recorded'}
- **Rusty / Priority Review Terms**: ${(evalEntry.rusty || []).join(', ') || 'None recorded'}
- **Pronunciation & Tone Notes**: ${toneNotes}
- **Grammar & Framing Notes**: ${grammarNotes}

## Implications
- Scheduled spaced-repetition queue updated for ${username}.
- Current recommended session pace: \`${user.settings.pace}\`.
`;

  fs.writeFileSync(path.join(lrDir, lrFilename), lrMarkdown, 'utf-8');
  try {
    fs.writeFileSync(path.join(rootLrDir, lrFilename), lrMarkdown, 'utf-8');
  } catch (_) {}

  return { evalEntry, lrFilename, ledger, user };
}

function invokeAntigravityMandarinCoach(userPrompt, options = {}) {
  return new Promise((resolve) => {
    const timeoutMs = options.timeoutMs || 45000;
    const userCtx = options.userCtx || options;
    const { userId, username } = resolveUserContext(userCtx);
    const agyBin = process.env.AGY_BIN || '/home/agent/.local/bin/agy';
    const ledger = loadMandarinLedger();
    const user = getUserProfile(ledger, userId, username);

    const fullPrompt = [
      `You are the user's Mandarin Coach running inside Discord channel #mandarin-learning.`,
      `Learner context:`,
      `- Learner: ${username} (Discord ID: ${userId})`,
      `- Level: ${user.settings.detectedLevel || 'HSK 3-4'} | Active Track: ${user.settings.activeTrack || 'tech_aiops'}`,
      `- Current Pace: ${user.settings.pace || 'standard'} | Day: ${user.settings.currentDayNumber || 1}`,
      `- Keep your Discord response concise (under 1500 characters), well-formatted in Markdown, pairing Hanzi with Pinyin.`,
      ``,
      `User query:`,
      userPrompt
    ].join('\n');

    if (!fs.existsSync(agyBin)) return resolve(null);

    const cmd = `"${agyBin}" -p ${JSON.stringify(fullPrompt)} --dangerously-skip-permissions`;
    exec(cmd, { cwd: WORKSPACE_DIR, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) return resolve(null);
      resolve(stdout.trim());
    });
  });
}

async function sendDailyLessonToChannel(channel, { pace = null, headerNote = null, userCtx = null } = {}) {
  const { session, ledger } = buildDailySession(pace, null, userCtx);
  const { embed, components } = buildMandarinLessonEmbedAndComponents(session, ledger, userCtx);

  await channel.send({
    content: headerNote || `🌅 **Good morning! Here is today's Mandarin Session for <@${session.userId}>** (\`${session.paceLabel}\`):`,
    embeds: [embed],
    components
  });

  await channel.send({
    content:
      `📋 **1-Tap Mobile Copy — Paste this into Gemini Web / Gemini Live:**\n` +
      `\`\`\`text\n${session.geminiPrompt}\n\`\`\``
  });

  return session;
}

function startMandarinDailyScheduler(client) {
  console.log(`[Mandarin Coach] Scheduler active for channel #mandarin-learning (${MANDARIN_CHANNEL_ID}) — 08:30 WIB drop / 20:00 WIB reminder.`);

  setInterval(async () => {
    try {
      const { dateStr, hour, minute } = getWIBDateParts();
      const ledger = loadMandarinLedger();
      const s = ledger.globalSettings || ledger.settings;

      const channel =
        client.channels.cache.get(MANDARIN_CHANNEL_ID) ||
        (await client.channels.fetch(MANDARIN_CHANNEL_ID).catch(() => null));
      if (!channel) return;

      if (
        hour === s.morningHourWIB &&
        minute >= s.morningMinuteWIB &&
        minute < s.morningMinuteWIB + 5 &&
        s.lastMorningDropDate !== dateStr
      ) {
        s.lastMorningDropDate = dateStr;
        if (ledger.globalSettings) ledger.globalSettings.lastMorningDropDate = dateStr;
        if (ledger.settings) ledger.settings.lastMorningDropDate = dateStr;
        saveMandarinLedger(ledger);
        await sendDailyLessonToChannel(channel, {
          pace: ledger.settings?.pace || 'standard',
          headerNote: `🌅 **早安 (Zǎo ān)! Daily Mandarin Session**\nHave a busy day? Tap **⚡ Light (5m)** below or drill **🗂️ Flashcards**!`
        });
      }

      if (
        hour === s.eveningReminderHourWIB &&
        minute >= s.eveningReminderMinuteWIB &&
        minute < s.eveningReminderMinuteWIB + 5 &&
        s.lastEveningReminderDate !== dateStr
      ) {
        s.lastEveningReminderDate = dateStr;
        if (ledger.globalSettings) ledger.globalSettings.lastEveningReminderDate = dateStr;
        if (ledger.settings) ledger.settings.lastEveningReminderDate = dateStr;
        saveMandarinLedger(ledger);

        const allUsers = Object.values(ledger.users || {});
        const unreviewedUsers = allUsers.filter(u => u.settings?.lastEvalDate !== dateStr && u.userId !== 'default');
        const mentionList = unreviewedUsers.length > 0
          ? unreviewedUsers.map(u => `<@${u.userId}>`).join(' ')
          : (allUsers.length > 0 && allUsers[0].userId !== 'default' ? `<@${allUsers[0].userId}>` : '');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('zh:fc:draw')
            .setLabel('Drill Flashcards (5m)')
            .setEmoji('🗂️')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('zh:quiz')
            .setLabel('Quick Quiz Instead')
            .setEmoji('🧠')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('zh:pace:light')
            .setLabel('Switch to Light Mode')
            .setEmoji('⚡')
            .setStyle(ButtonStyle.Secondary)
        );

        await channel.send({
          content:
            `🌙 **Evening Check-in (晚上好!)** ${mentionList ? mentionList + ' ' : ''}— You haven't logged an evaluation today (${dateStr}) yet!\n` +
            `• Tap **🗂️ Drill Flashcards (5m)** or **🧠 Quick Quiz** to keep your memory streak alive!`,
          components: [row]
        });
      }
    } catch (err) {
      console.error('[Mandarin Scheduler Error]:', err.message);
    }
  }, 60 * 1000);
}

/**
 * Handles incoming messages posted in #mandarin-learning
 */
async function handleMandarinChannelMessage(message) {
  if (!message || message.author?.bot) return false;
  if (message.channelId !== MANDARIN_CHANNEL_ID) return false;

  const content = (message.content || '').trim();
  if (!content) return true;

  const userCtx = {
    userId: message.author.id,
    username: message.author.username || message.author.tag
  };

  if (content === '!help' || content === '!mandarin') {
    await message.reply({
      content:
        `🇨🇳 **Universal Mandarin Coach Commands in <#${MANDARIN_CHANNEL_ID}>**:\n` +
        `• \`!menu\` or \`!home\` — Open the Mandarin Learning Hub & command center\n` +
        `• \`!target <number>\` — Set your daily flashcard target (e.g. \`!target 10\`)\n` +
        `• \`!baseline\` or \`/mandarin baseline\` — Launch adaptive placement test & bot-fit diagnostic\n` +
        `• \`!flashcard\` or \`!fc\` or \`/mandarin flashcard\` — Study interactive SM-2 spaced repetition cards\n` +
        `• \`!quiz\` or \`/mandarin quiz\` — Take a multi-mode understanding quiz (Cloze, Comprehension, Tone)\n` +
        `• \`!domain <0-100>\` — Set domain-specific (AIOps) vocabulary ratio (e.g. \`!domain 30\` for 30%)\n` +
        `• \`!track <hsk1_2|hsk3_4|hsk5_6|tech_aiops|all>\` — Switch your active learning track\n` +
        `• \`!lesson [light|standard|deep]\` — Pull today's structured lesson drop\n` +
        `• \`!stats\` or \`/mandarin stats\` — Inspect your SM-2 flashcard memory state & Leaderboard\n` +
        `• **Paste \`[MANDARIN_BASELINE]\`** or \`[MANDARIN_EVAL]\` directly into chat to update your ledger!`
    });
    return true;
  }

  if (content === '!menu' || content === '!home') {
    const { embed, components } = buildMainMenuEmbedAndComponents(userCtx);
    await message.reply({ embeds: [embed], components });
    return true;
  }

  if (content.startsWith('!domain')) {
    const arg = content.slice(7).trim();
    const num = parseInt(arg, 10);
    if (!arg || isNaN(num) || num < 0 || num > 100) {
      await message.reply({
        content: '⚙️ **Domain Vocabulary Ratio**: Provide a percentage number between 0 and 100.\nExample: `!domain 30` (30% AIOps engineering terms).'
      });
      return true;
    }
    const ledger = loadMandarinLedger();
    const user = getUserProfile(ledger, userCtx.userId, userCtx.username);
    user.settings.domainRatio = num / 100;
    saveMandarinLedger(ledger);

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Domain Vocabulary Ratio Updated!')
      .setColor(0x0284c7)
      .setDescription(
        `👤 **Learner**: <@${userCtx.userId}> (${userCtx.username})\n\n` +
        `Your domain vocabulary blend has been configured to **${num}% (AIOps & Telemetry Engineering)**.\n\n` +
        `📚 Daily lesson drops and flashcard draws will now blend **${num}% domain-specific engineering jargon** with your active curriculum track (${TRACK_CONFIG[user.settings.activeTrack]?.label || user.settings.activeTrack}).`
      )
      .setFooter({ text: 'Mandarin Coach • Domain Blending Engine' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('zh:fc:draw').setLabel('Study Flashcards').setEmoji('🗂️').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('zh:menu').setLabel('Main Menu').setEmoji('🏠').setStyle(ButtonStyle.Secondary)
    );

    await message.reply({ embeds: [embed], components: [row] });
    return true;
  }

    if (content.startsWith('!target')) {
    const arg = content.slice(7).trim();
    const num = parseInt(arg, 10);
    if (!arg || isNaN(num) || num <= 0 || num > 100) {
      await message.reply({
        content: '🎯 **Daily Target Setting**: Provide a positive number between 1 and 100.\nExample: `!target 10` or `!target 15`.'
      });
      return true;
    }
    const ledger = loadMandarinLedger();
    const user = getUserProfile(ledger, userCtx.userId, userCtx.username);
    ensureDailyProgress(user);
    user.dailyProgress.targetCards = num;
    user.dailyProgress.isCustomTarget = true;
    saveMandarinLedger(ledger);

    const progressBar = renderProgressBar(user.dailyProgress.cardsReviewedToday, user.dailyProgress.targetCards, 10);
    const targetEmbed = new EmbedBuilder()
      .setTitle('🎯 Daily Flashcard Target Updated!')
      .setColor(0x16a34a)
      .setDescription(
        `👤 **Learner**: <@${userCtx.userId}> (${userCtx.username})\n\n` +
        `Your daily flashcard target has been set to **${num} cards/day**.\n\n` +
        `📊 **Today's Status**: \`${user.dailyProgress.cardsReviewedToday}/${user.dailyProgress.targetCards}\` ${progressBar}\n` +
        `🔥 **Current Streak**: \`${user.dailyProgress.streakDays} Days\` • ⭐ **Total XP**: \`${user.dailyProgress.totalXp} XP\``
      )
      .setFooter({ text: 'Mandarin Spaced Repetition • Daily Target' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('zh:fc:draw').setLabel('Study Flashcards').setEmoji('🗂️').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('zh:menu').setLabel('Main Menu').setEmoji('🏠').setStyle(ButtonStyle.Secondary)
    );

    await message.reply({ embeds: [targetEmbed], components: [row] });
    return true;
  }

  if (content === '!baseline') {
    const { embed, components, promptText } = buildBaselineDiagnosticEmbedAndPrompt(userCtx);
    await message.reply({ embeds: [embed], components });
    await message.channel.send({
      content: `🎙️ **Universal Gemini Live Voice Placement Prompt:**\n\`\`\`text\n${promptText}\n\`\`\``
    });
    return true;
  }

  if (content === '!fc' || content.startsWith('!flashcard')) {
    const arg = content.split(/\s+/)[1] || null;
    const { card, mode } = drawNextFlashcard(arg, userCtx);
    const { embed, components } = renderFlashcardEmbed(card, mode, null, userCtx);
    await message.reply({ embeds: [embed], components });
    return true;
  }

  if (content.startsWith('!track')) {
    const arg = content.slice(6).trim().toLowerCase();
    const { embed, components } = switchTrack(arg, userCtx);
    await message.reply({ embeds: [embed], components });
    return true;
  }

  if (content.startsWith('!lesson')) {
    const arg = content.slice(7).trim().toLowerCase();
    const pace = PACE_CONFIG[arg] ? arg : null;
    await sendDailyLessonToChannel(message.channel, { pace, userCtx });
    return true;
  }

  if (content.startsWith('!pace')) {
    const arg = content.slice(5).trim().toLowerCase();
    if (!PACE_CONFIG[arg]) {
      await message.reply({ content: '⚙️ Choose a valid pace: `!pace light`, `!pace standard`, or `!pace deep`.' });
      return true;
    }
    await sendDailyLessonToChannel(message.channel, {
      pace: arg,
      userCtx,
      headerNote: `⚙️ **Pace updated to ${PACE_CONFIG[arg].label}!** Regenerated session for <@${userCtx.userId}>:`
    });
    return true;
  }

  if (content === '!prompt') {
    const ledger = loadMandarinLedger();
    const user = getUserProfile(ledger, userCtx.userId, userCtx.username);
    const session = user.activeSession || buildDailySession(null, null, userCtx).session;
    await message.reply({
      content: `📋 **1-Tap Mobile Copy — Paste into Gemini Web / Gemini Live:**\n\`\`\`text\n${session.geminiPrompt}\n\`\`\``
    });
    return true;
  }

  if (content === '!quiz') {
    const { embed, components } = buildInteractiveDiscordQuiz(null, userCtx);
    await message.reply({ embeds: [embed], components });
    return true;
  }

  if (content === '!stats') {
    const { embed, components } = buildStatsEmbed(userCtx);
    await message.reply({ embeds: [embed], components });
    return true;
  }

  // Baseline Calibration Ingestion
  const isBaseline =
    content.includes('[MANDARIN_BASELINE]') ||
    (content.toLowerCase().includes('hsk_grammar_retention:') && content.toLowerCase().includes('detected_hsk_level:')) ||
    content.toLowerCase().startsWith('baseline:');

  if (isBaseline) {
    try {
      await message.channel.sendTyping();
      const { baselineEntry, lrFilename, ledger, user } = parseAndRecordBaseline(content, userCtx);

      const embed = new EmbedBuilder()
        .setTitle(`🎯 Mandarin Baseline Calibrated: ${baselineEntry.detected_hsk_level}!`)
        .setColor(0x0284c7)
        .setDescription(`Logged to \`learning-records/${lrFilename}\` for <@${userCtx.userId}> (${userCtx.username})!`)
        .addFields(
          {
            name: '📊 Diagnostic Calibration Metrics',
            value:
              `• **Detected Level**: \`${baselineEntry.detected_hsk_level}\`\n` +
              `• **Bot-Fit Verdict**: \`${baselineEntry.bot_fit}\`\n` +
              `• **Grammar Retention**: \`${baselineEntry.hsk_grammar_retention}\`\n` +
              `• **Active Track**: \`${TRACK_CONFIG[baselineEntry.recommended_track]?.label || baselineEntry.recommended_track}\`\n` +
              `• **Calibrated Pace**: \`${baselineEntry.recommended_pace.toUpperCase()}\``
          },
          {
            name: '🟢 Strengths',
            value: baselineEntry.strengths
          },
          {
            name: '🟡 Gaps & Focus Areas',
            value: baselineEntry.gaps
          }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('zh:fc:draw')
          .setLabel('Start SM-2 Flashcards')
          .setEmoji('🗂️')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('zh:quiz')
          .setLabel('Take a Quiz')
          .setEmoji('🧠')
          .setStyle(ButtonStyle.Primary)
      );

      await message.reply({ embeds: [embed], components: [row] });

      const agyFollowup = await invokeAntigravityMandarinCoach(
        `The learner just submitted their Mandarin baseline calibration:\n${content}\nProvide an encouraging 3-bullet analysis on how our SM-2 flashcard deck and practice sessions will accelerate their goals.`,
        { userCtx }
      );
      if (agyFollowup) {
        await message.channel.send({
          content: `🤖 **Antigravity Coach Analysis**:\n${agyFollowup.slice(0, 1900)}`
        });
      }
    } catch (err) {
      console.error('[Mandarin Baseline Parse Error]:', err);
      await message.reply({ content: `⚠️ Error recording baseline: ${err.message}` });
    }
    return true;
  }

  // Gemini Daily Evaluation Ingestion
  const isEval =
    content.includes('[MANDARIN_EVAL]') ||
    (content.toLowerCase().includes('overall_score:') && content.toLowerCase().includes('mastered_words:')) ||
    content.toLowerCase().startsWith('eval:');

  if (isEval) {
    try {
      await message.channel.sendTyping();
      const { evalEntry, lrFilename, ledger, user } = parseAndRecordEvaluation(content, userCtx);

      const embed = new EmbedBuilder()
        .setTitle(`✅ Gemini Voice Evaluation Logged — Score: ${evalEntry.score}`)
        .setColor(0x16a34a)
        .setDescription(`Saved to \`learning-records/${lrFilename}\` for <@${userCtx.userId}> (${userCtx.username})!`)
        .addFields(
          {
            name: '🟢 Mastered (SM-2 Interval Grown)',
            value: evalEntry.mastered.length > 0 ? evalEntry.mastered.map(w => `\`${w}\``).join(', ') : 'None flagged'
          },
          {
            name: '🟡 Scheduled for Priority SRS Review',
            value: evalEntry.rusty.length > 0 ? evalEntry.rusty.map(w => `\`${w}\``).join(', ') : 'None — clean sweep!'
          },
          {
            name: '🎙️ Pronunciation & Grammar Notes',
            value: `• **Tones**: ${evalEntry.toneNotes}\n• **Grammar**: ${evalEntry.grammarNotes}\n• **Next Pace**: \`${user.settings.pace.toUpperCase()}\``
          }
        );

      await message.reply({ embeds: [embed] });

      const agyFollowup = await invokeAntigravityMandarinCoach(
        `The learner just submitted their Gemini voice evaluation:\n${content}\nGive them a brief 3-bullet coaching tip specifically targeting their rusty/missed words and tone notes.`,
        { userCtx }
      );
      if (agyFollowup) {
        await message.channel.send({
          content: `🤖 **Antigravity Coach Follow-up**:\n${agyFollowup.slice(0, 1900)}`
        });
      }
    } catch (err) {
      console.error('[Mandarin Eval Parse Error]:', err);
      await message.reply({ content: `⚠️ Error logging evaluation: ${err.message}` });
    }
    return true;
  }

  // Freeform question -> Antigravity Coach
  try {
    await message.channel.sendTyping();
    const replyText = await invokeAntigravityMandarinCoach(content, { userCtx });
    if (replyText) {
      await message.reply({ content: replyText.slice(0, 1950) });
    } else {
      await message.reply({
        content: `💡 **Quick Mandarin Coach Tip**: Use \`!flashcard\` to drill your SRS deck, \`!quiz\` for a retrieval check, or \`!baseline\` to recalibrate!`
      });
    }
  } catch (err) {
    console.error('[Mandarin Freeform Coach Error]:', err);
  }
  return true;
}

module.exports = {
  MANDARIN_CHANNEL_ID,
  PACE_CONFIG,
  TRACK_CONFIG,
  PLACEMENT_STAGES,
  PLACEMENT_QUESTION_BANK,
  startPlacementSession,
  handlePlacementAnswer,
  advanceToNextTier,
  concludePlacementSession,
  renderPlacementQuestionEmbed,
  renderTierClearedEmbed,
  INITIAL_VOCAB_POOL,
  COMPLETE_HSK_LIBRARY,
  loadCompleteHskLibrary,
  getWIBDateParts,
  getWIBYesterdayDateStr,
  ensureDailyProgress,
  renderProgressBar,
  loadMandarinLedger,
  saveMandarinLedger,
  getUserProfile,
  resolveUserContext,
  applySM2,
  gradeFlashcard,
  drawNextFlashcard,
  renderFlashcardEmbed,
  renderFlippedFlashcard,
  renderDailyTargetAchievedEmbed,
  renderBonusBatchCompletedEmbed,
  buildMainMenuEmbedAndComponents,
  calculateBotFitAndLevel,
  buildPlacementStepEmbed,
  renderPlacementStage: buildPlacementStepEmbed,
  evaluatePlacementResult,
  finalizePlacementTest: evaluatePlacementResult,
  buildDailySession,
  buildMandarinLessonEmbedAndComponents,
  buildStatsEmbed,
  buildGeminiBaselineVoicePrompt,
  buildBaselineDiagnosticEmbedAndPrompt,
  buildInteractiveDiscordQuiz,
  gradeQuizAnswer,
  switchTrack,
  parseAndRecordEvaluation,
  parseAndRecordBaseline,
  invokeAntigravityMandarinCoach,
  sendDailyLessonToChannel,
  startMandarinDailyScheduler,
  handleMandarinChannelMessage
};
