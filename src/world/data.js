/* NextWorld · data: the catalogue, the taxonomy, NextWork itself
 * Part of the NextWorld feature. Plain script, no modules, so the same file
 * runs in the extension page and in the bundled concept demo. */
'use strict';
(function () {
  window.NW = window.NW || {};
  /* The 90 NextWork projects, by series, with how many people had finished
   * each when this was written. Fewer finishers = harder = more XP. */
  const SERIES = [
    { id: 'account',   name: 'Account Management',          kind: 'home',       hard: 0, projects: [['Set Up An AWS Account', 5680]] },
    { id: 'cbc',       name: 'Cloud Beginner Challenge',    kind: 'home',       hard: 0, projects: [['Join the Cloud Beginner Challenge!', 1380], ['Host a Website on Amazon S3', 4710], ['Cloud Security with AWS IAM', 2290]] },
    { id: 'vpc',       name: 'Amazon VPC',                  kind: 'tower',       hard: 1, projects: [['Build a Virtual Private Cloud', 1870], ['VPC Traffic Flow and Security', 1240], ['Creating a Private Subnet', 980], ['Launching VPC Resources', 850], ['Testing VPC Connectivity', 700], ['VPC Peering', 640], ['VPC Monitoring with Flow Logs', 580], ['Access S3 from a VPC', 540], ['VPC Endpoints', 490]] },
    { id: 'databases', name: 'Databases',                   kind: 'barn',   hard: 1, projects: [['Aurora Database with EC2', 490], ['Connect a Web App with Aurora', 390], ['Load Data into DynamoDB', 400], ['Query Data with DynamoDB', 330]] },
    { id: 'k8s',       name: 'Kubernetes',                  kind: 'yard',  hard: 1, projects: [['Launch a Kubernetes Cluster', 270], ['Set Up Kubernetes Deployment', 200], ['Create Kubernetes Manifests', 170], ['Deploy Backend with Kubernetes', 170]] },
    { id: 'devops',    name: '6 Day DevOps Challenge',      kind: 'workshop',    hard: 1, projects: [['Set Up a Web App in the Cloud', 1550], ['Connect a GitHub Repo with AWS', 1070], ['Secure Packages with CodeArtifact', 630], ['Continuous Integration with CodeBuild', 490], ['Deploy a Web App with CodeDeploy', 390], ['Build a CI/CD Pipeline with AWS', 300]] },
    { id: 'threetier', name: 'Three-Tier',                  kind: 'datacentre',  hard: 1, projects: [['Website Delivery with CloudFront', 260], ['APIs with Lambda + API Gateway', 220], ['Fetch Data with AWS Lambda', 210], ['Build a Three-Tier Web App', 200]] },
    { id: 'security',  name: 'Security',                    kind: 'vault',        hard: 1, projects: [['Encrypt Data with AWS KMS', 320], ['Threat Detection with GuardDuty', 200], ['Secure Secrets with Secrets Manager', 140], ['Build a Security Monitoring System', 210]] },
    { id: 'lex',       name: 'Amazon Lex Chatbot',          kind: 'lab', hard: 0, projects: [['Welcome to the Lex Chatbot series!', 230], ['Build a Chatbot with Amazon Lex', 1240], ['Add Custom Slots to a Lex Chatbot', 780], ['Connect Amazon Lex with Lambda', 610], ['Save User Info with a Lex Chatbot', 480], ['Set Up Multiple Slots in a Lex Chatbot', 410]] },
    { id: 'bedrock',   name: 'Amazon Bedrock',              kind: 'lab', hard: 1, projects: [['Build an AI Chatbot with Amazon Bedrock', 60], ['AI Finance Agent with Amazon Bedrock', 30], ['AI Email Router with Bedrock Flows', 20]] },
    { id: 'rag',       name: 'RAG API',                     kind: 'datacentre',  hard: 1, projects: [['Run Ollama On Your Own Machine', 320], ['Build a RAG API with FastAPI', 520]] },
    { id: 'terraform', name: 'Terraform',                   kind: 'workshop',    hard: 1, projects: [['Create S3 Buckets with Terraform', 230]] },
    { id: 'transcribe',name: 'Amazon Transcribe',           kind: 'lab', hard: 0, projects: [['Transcribe Audio Files with AI', 40]] },
    { id: 'intro',     name: 'Intro to Claude',             kind: 'lab', hard: 0, projects: [['Explore Claude.ai, Code, and Cowork', 50], ['Claude Code Skills Basics', 30], ['Get Started with Claude Code', 80]] },
    { id: 'everyday',  name: 'Claude for Everyday Life',    kind: 'home', hard: 0, projects: [['Build a Fitness Coach with Claude', 30], ['Tailor Your Resume with Claude Dispatch', 10], ['Build a Calorie Tracker with Claude', 10]] },
    { id: 'work',      name: 'Claude for Work Productivity',kind: 'home', hard: 0, projects: [['Build a Dashboard with Claude Artifacts', 20], ['Automate Your Email Briefing with Claude', 10], ['Build an AI Meeting Prep Assistant', 5], ['Intro to Linear Agents + Claude', 0]] },
    { id: 'brain',     name: 'Claude AI Second Brain',      kind: 'library', hard: 0, projects: [['Build an AI Second Brain with Claude Code', 120], ['Automate Your AI Second Brain', 20]] },
    { id: 'code',      name: 'Claude Code',                 kind: 'workshop',    hard: 1, projects: [['Set Up Claude Code Guardrails', 30], ['Design to Code: Paper + Claude Code via MCP', 10], ['Claude Code with Git Worktrees', 10], ["Set Up Claude Code's Status Line", 30], ['Video Editing with Claude x Remotion', 0], ['Viral Carousels with Claude x Paper', 0]] },
    { id: 'prompt',    name: 'Claude Prompt Engineering',   kind: 'library', hard: 0, projects: [['Prompt Engineering for Healthcare', 20], ['Prompt Engineering for Research', 20], ['Prompt Engineer a Lesson Plan', 20]] },
    { id: 'git',       name: 'Git & GitHub',                kind: 'library',    hard: 0, projects: [['Learn Git Fundamentals', 0], ['Git Pull Requests and Merging', 0], ['Git Branching and Rebasing', 0], ['Git Undo, Recovery, and Debugging', 0]] },
    { id: 'beginnerai',name: 'Beginner AI Projects',        kind: 'lab', hard: 0, projects: [['Ship a Landing Page with v0 and Vercel', 190], ['Build a Blog Writing Crew with CrewAI', 40], ['Automate Your Calendar with AI', 340]] },
    { id: 'agents',    name: 'AI Agents · Hermes',          kind: 'lab', hard: 1, projects: [['Set Up Hermes Agent for Free', 10], ['Give Hermes Agent Powers with MCP', 3]] },
    { id: 'openclaw',  name: 'Build with OpenClaw',         kind: 'lab', hard: 1, projects: [['Build a Telegram AI Bot with OpenClaw', 10], ['Give Your Assistant a Memory', 7], ['Build an Automated AI Briefing', 8]] },
    { id: 'cursor',    name: 'Cursor',                      kind: 'workshop',    hard: 0, projects: [['Build a Spotify Clone with Cursor', 130], ['Create a Docker Container using Cursor', 90]] },
    { id: 'chat',      name: 'Gemini · ChatGPT',            kind: 'lab', hard: 0, projects: [['Gemini AI Email Assistant', 0], ['Personalize Your ChatGPT', 10], ['ChatGPT Prompting Hack', 8]] },
    { id: 'secai',     name: 'Security x AI · AI Safety',   kind: 'vault',        hard: 1, projects: [['AI Security Scanner for Python', 70], ['Do this before downloading any MCP or Skill', 10]] },
    { id: 'design',    name: 'System Design',               kind: 'library',    hard: 1, projects: [['URL Shortener System Design', 20], ['Break a Distributed System on Purpose', 10]] }
  ];
  const xpFor = (done, hard) => 50 + (done >= 1000 ? 10 : done >= 200 ? 25 : done >= 50 ? 45 : 70) + (hard ? 20 : 0);
  const PROJECTS = []; SERIES.forEach(sr => sr.projects.forEach((pr, i) => PROJECTS.push({ title: pr[0], series: sr.id, part: i + 1, of: sr.projects.length, xp: xpFor(pr[1], sr.hard) })));
  const CATALOGUE_XP = PROJECTS.reduce((a, p) => a + p.xp, 0);

  /* What a finished project becomes. Homes for the everyday, labs for AI,
   * libraries for the things you read and design, barns for what you
   * store, vaults for what you protect, towers for what you connect. */
  const KIND_NAME = { home: 'Home', lab: 'Research lab', library: 'Library', barn: 'Barn', tower: 'Signal tower', workshop: 'Workshop', vault: 'Vault', datacentre: 'Data centre', yard: 'Container yard', clinic: 'Clinic', bank: 'Bank' };
  const ICON = { home: '🏠', lab: '🔬', library: '📚', barn: '🌾', tower: '📡', workshop: '🔧', vault: '🛡️', datacentre: '🏢', yard: '📦', clinic: '🩺', bank: '🏦' };
  /* a learn list's building comes from what it is about */
  function kindFor(name) { const n = name.toLowerCase(); if (/health|medic|clinic|neuro|aging|kinesio|biolog/.test(n)) return 'clinic'; if (/financ|bank|quant|real estate|value/.test(n)) return 'bank'; if (/secur|govern|protect|compliance/.test(n)) return 'vault'; if (/cloud|platform|federal|deliver/.test(n)) return 'datacentre'; if (/agent|ai |ai$|dojo|grok|neuro/.test(n)) return 'lab'; if (/leader|framework|priorit|architect/.test(n)) return 'library'; if (/startup|company|engineer|full-stack|crown/.test(n)) return 'workshop'; return 'home'; }

  /* The eight hubs round NextWork HQ: the roadmaps on the site, as places. */
  const HUBS = [
    { id: 'cloud',   name: 'Cloud',        sub: 'Cloud Engineer roadmap · 45 projects', kind: 'datacentre' },
    { id: 'ai',      name: 'AI',           sub: 'AI Beginner roadmap · 38 projects',   kind: 'lab' },
    { id: 'devops',  name: 'DevOps',       sub: 'DevOps roadmap · 14 projects',        kind: 'workshop' },
    { id: 'sec',     name: 'Security',     sub: 'Security Engineer roadmap · 14',      kind: 'vault' },
    { id: 'design',  name: 'System Design',sub: '23 projects',                              kind: 'library' },
    { id: 'health',  name: 'Healthcare',   sub: 'Project Generator domain',                 kind: 'clinic' },
    { id: 'finance', name: 'Finance',      sub: 'Project Generator domain',                 kind: 'bank' },
    { id: 'prod',    name: 'Productivity', sub: 'Productivity roadmap · 9 projects',   kind: 'home' }
  ];
  /* NextWork, in its own words, for the HQ tab. Read from nextwork.ai and its story. */
  const ABOUT = {
    tagline: 'Learn anything by building',
    mission: "Meet the skill demand to solve the world's toughest problems.",
    story: 'NextWork began as a one-person Salesforce training business in New Zealand. Its founder, Amber Winton, noticed that certificates were not what got learners hired; the projects they could talk about were. So the course became projects, the projects became documentation learners could show, and the business became NextWork.',
    facts: [['90', 'projects in the catalogue'], ['10+', 'roadmaps, from AWS Beginner to DevSecOps'], ['1', 'Project Generator, for anything the catalogue does not cover'], ['Discord', 'where the community builds together']],
    roadmaps: [['Cloud Engineer', 45], ['AWS Cloud Practitioner', 42], ['AI Beginner', 38], ['DevSecOps', 35], ['Solutions Architect', 35], ['System Design', 23], ['Claude', 22], ['DevOps', 14], ['Security Engineer', 14], ['Networks', 11], ['Productivity', 9]],
    /* hosts and paths; the page adds the scheme, so no address is hard-wired here */
    links: [['The NextWork Story', 'blog.nextwork.ai/p/the-nextwork-story'], ['Explore projects', 'nextwork.ai/projects'], ['Community', 'nextwork.ai']]
  };
  const TIERS = [[0, 'Plot'], [100, 'Homestead'], [300, 'Hamlet'], [700, 'Village'], [1500, 'Town'], [3000, 'City'], [6000, 'Metropolis']];
  const levelOf = xp => xp >= 140 ? 5 : xp >= 120 ? 4 : xp >= 95 ? 3 : xp >= 75 ? 2 : 1;
  const tierOf = xp => { let t = TIERS[0]; TIERS.forEach(x => { if (xp >= x[0]) t = x; }); return t; };
  const nextTier = xp => TIERS.find(x => x[0] > xp);

  /* The bulletin board: where a new learner starts. Real projects, first parts. */
  const START_HERE = [
    ['Set Up An AWS Account', 'account', 'Ten minutes. Your first home goes up.'],
    ['Host a Website on Amazon S3', 'cbc', 'Something on the internet with your name on it.'],
    ['Build a Virtual Private Cloud', 'vpc', 'The first tower. Networks are where cloud gets real.'],
    ['Explore Claude.ai, Code, and Cowork', 'intro', 'The AI tools you will use for everything after.'],
    ['Set Up a Web App in the Cloud', 'devops', 'Day one of the six-day DevOps challenge.']
  ];

  /* A sample library, so dev mode has something to show. In production the
   * extension reads the real one off the portfolio page. */
  const SAMPLE_LISTS = [
    ['Cloud Systems Engineering', 14, 'Cloud platforms engineered for scale, reliability, and uptime.'],
    ['Fresh Off the Crown', 13, 'Follows the AI race and ships a 30-minute build each time.'],
    ['Agentic Systems Engineering', 11, 'AI agents and orchestration that move from prompt to outcome.'],
    ['Build & Brew: AI Dojo - Solutions Engineering', 9, 'One rep. One project. Real systems built and defended end to end.'],
    ['Federal Principal Cloud Platform Engineering', 7, 'Principal-level builds: pipeline, promotion path, compliance evidence.'],
    ['Solo Startup Systems Engineering', 7, 'Systems for building and scaling a startup as a solo operator.'],
    ['Value-Driven Systems Engineering', 6, 'Solutions and strategy for small and growing business operators.'],
    ['Applied Frameworks Systems Engineering', 5, 'Frameworks from books, engineered into working systems.'],
    ['Leadership Systems Engineering', 4, 'Leadership frameworks engineered as working systems.'],
    ['Delivery Systems Engineering', 4, 'Multi-team customer engagements built to scale.'],
    ['Governance Systems Engineering', 4, 'Systems aligned to enterprise governance and security standards.'],
    ['Government Systems Engineering', 4, 'Cloud systems engineered for federal-grade compliance.'],
    ['A Solo-Operated Company Built on GrokBot', 3, 'A solo company with GrokBot as the foundation.'],
    ['Priority Management Systems', 3, 'A personal operating system, one evidence-backed practice at a time.'],
    ['Real Estate Development', 3, 'Learning the field by building it end to end.'],
    ['Global Problem Systems Engineering', 3, 'Population-scale systems for civic and public-good outcomes.'],
    ['Protecting Your Daily Life From AI, With AI', 2, 'Lock down the AI you use, then protect your family and clients.'],
    ['From Scratch to Principal Full-Stack Engineer', 2, 'From your first line of code to a job, one small build at a time.'],
    ['Residential Architecture', 1, 'Learning the field by building it end to end.'],
    ['Quantitative Finance', 1, 'Learning the field by building it end to end.'],
    ['Computational Neuroscience', 1, 'Learning the field by building it end to end.'],
    ['Kinesiology & Human Movement', 1, 'Learning the field by building it end to end.'],
    ['Biology of Aging & Geroscience', 1, 'Learning the field by building it end to end.'],
    ['Other projects', 20, 'Everything else you authored, outside a list.']
  ].map(l => ({ name: l[0], total: l[1], done: l[1], blurb: l[2], kind: kindFor(l[0]) }));
  const SAMPLE_DONE = ['Set Up An AWS Account', 'Join the Cloud Beginner Challenge!', 'Host a Website on Amazon S3', 'Cloud Security with AWS IAM', 'Build a Virtual Private Cloud', 'VPC Traffic Flow and Security', 'Creating a Private Subnet', 'Aurora Database with EC2', 'Launch a Kubernetes Cluster', 'Set Up a Web App in the Cloud', 'Connect a GitHub Repo with AWS', 'Explore Claude.ai, Code, and Cowork', 'Claude Code Skills Basics', 'Welcome to the Lex Chatbot series!'];

  const INFRA = { shelter: ['Shelter', 'a second tent: room for two more'], pump: ['Water pump', 'water, before anything else'], foodcache: ['Food cache', 'food kept up off the ground'], woodshed: ['Woodshed', 'fuel for the fire'], lantern: ['Lantern pole', 'light after dark'], stockade: ['Stockade', 'walls round what you have'], windmill: ['Windmill', 'power from the wind'], tank: ['Water tank', 'water stored for dry days'], workshop: ['Workshop', 'somewhere to make and mend'], watchtower: ['Watchtower', 'a watch on the walls'], well: ['Well', 'water that lasts'], townhall: ['Town hall', 'somewhere to decide things together'], school: ['Schoolhouse', 'the next people taught'], store: ['General store', 'what people need, close by'], community: ['Community hall', 'a room for everyone'], barn: ['Barn', 'the harvest kept dry'], coop: ['Chicken coop', 'eggs every morning'], paddock: ['Paddock', 'room for the animals'], cityhall: ['City hall', 'a city run properly'], hospital: ['Hospital', 'care when it is needed'], library: ['Library', 'everything known, kept'], firestation: ['Fire station', 'help within minutes'], datacentre: ['Data centre', 'what keeps the city running'], park: ['Park', 'somewhere to breathe'], station: ['Station', 'a way in and out'], rail: ['Rail line', 'the line to everywhere'], university: ['University', 'others taught what you learned'], stadium: ['Stadium', 'a crowd, together'], solar: ['Solar farm', 'power that does not run out'], watertower: ['Water tower', 'pressure for every tap'], capitol: ['The Capitol', 'a country decided here'], arch: ['Triumphal arch', 'the head of the mall'], obelisk: ['The Obelisk', 'a needle of white stone, ringed with flags'], pool: ['Reflecting pool', 'the capitol, twice'], memorial: ['The Memorial', 'the founder, in bronze, before the steps'], skypad: ['The Skypad', 'the seat of the kingdom, up on its column'], hoverport: ['Hoverport', 'where the hover cars land'], skyisland: ['Sky district', 'a whole district that floats'], palace: ['The Palace', 'the seat of a kingdom'], townhall2: ['Second city hall', 'the far bank run properly'] };
  /* what the pineapple says while you build: one line a step, the lesson under the game */
  const LESSONS = ['Every step is a brick. Bricks make walls.', 'Same step every day beats a big weekend.', 'You are building for the you of next year.', 'People moved in because you showed up.', 'Halfway is a wall. Keep going: the roof is next.', 'Nobody builds a city in a day. Everybody builds it daily.', 'The town runs on what you learned this week.', 'Finish this and it is yours for good.', 'Small steps, kept, are how kingdoms happen.', 'The lights stay on because you came back.', 'What you know protects what you build.', 'One more step. Then one more.'];
  const IMPACT = ['yourself', 'your family', 'a town of learners', 'a city that depends on you', 'a region that runs on what you know', 'a country that learns from you', 'a society you built'];
  Object.assign(NW, { INFRA, IMPACT, LESSONS, SERIES, PROJECTS, CATALOGUE_XP, xpFor, KIND_NAME, ICON, kindFor, HUBS, ABOUT, TIERS, levelOf, tierOf, nextTier, START_HERE, SAMPLE_LISTS, SAMPLE_DONE });
})();
