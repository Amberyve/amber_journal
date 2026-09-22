/* The twelve weekly themes and eighty-four daily prompts.
   Written for Amber Journal. Edit freely — the app reads length from here,
   so keep 12 weeks of 7 prompts unless you also change TOTAL_DAYS. */

export const WEEKS = [
  {
    hil: "Pagsugod", en: "Beginnings",
    quote: "Every cup starts cold. Start anyway.",
    reflect: "Nothing begins finished. The first sip is never the best one — it is only the one that gets you to the second. This week, let things be unpolished.",
    intention: "This week I am beginning:",
    prompts: [
      "What is one thing you have been waiting to feel ready for?",
      "Describe your morning today in three sentences, without judging any of it.",
      "What did you begin this year that you have already forgotten about?",
      "If today were the first day of something, what would you want it to be the first day of?",
      "What is the smallest possible version of the thing you want to start?",
      "Who began something that made your life easier? Have you thanked them?",
      "What would you attempt this week if no one would see the first draft?",
    ],
  },
  {
    hil: "Pagpasalamat", en: "Gratitude",
    quote: "Salamat is a full sentence.",
    reflect: "Gratitude is not pretending things are fine. It is noticing what held steady while other things fell. Short lists still count.",
    intention: "This week I want to notice:",
    prompts: [
      "Name three ordinary things you would miss if they disappeared tomorrow.",
      "Who made your day lighter this week without knowing it?",
      "What is something your younger self would be amazed you have now?",
      "What went right today that you had planned for, and what went right that you did not expect?",
      "Write a thank-you that you have never said out loud.",
      "What part of your body carried you well today?",
      "What is one hard thing you are, unexpectedly, grateful for?",
    ],
  },
  {
    hil: "Pahuway", en: "Rest",
    quote: "Even the kettle is allowed to cool.",
    reflect: "Rest is not the reward for finishing. It is part of the work. This week, sit down for the coffee instead of drinking it at the sink.",
    intention: "This week I am giving myself permission to:",
    prompts: [
      "When did you last rest without feeling guilty about it?",
      "What are you doing out of habit that you could stop doing?",
      "What does tired feel like in your body right now? Be specific.",
      "Who taught you that rest had to be earned?",
      "What would a genuinely slow morning look like for you?",
      "What is one thing on your list that could wait a week and cost nothing?",
      "What refills you that has nothing to do with your phone?",
    ],
  },
  {
    hil: "Kaisog", en: "Courage",
    quote: "Brave is usually quiet, and usually early in the morning.",
    reflect: "Courage is rarely dramatic. It is the message you finally send, the price you name without apologizing. Nobody claps. You just notice, afterward, that you did it.",
    intention: "This week I am brave enough to:",
    prompts: [
      "What conversation have you been avoiding, and what is it costing you?",
      "When were you braver than you gave yourself credit for?",
      "What would you say if you knew it would be received kindly?",
      "What are you afraid people will find out about you? Is it actually a flaw?",
      "What is the smallest brave thing you could do before lunch tomorrow?",
      "Who in your life is quietly brave? What do you notice about how they do it?",
      "What would change if you stopped apologizing for taking up room?",
    ],
  },
  {
    hil: "Gagmay nga Kadalag-an", en: "Small Wins",
    quote: "A finished small thing beats a beautiful unfinished one.",
    reflect: "Almost all of life is made of small finished things. The dishes done. The reply sent. The walk taken. Count them this week.",
    intention: "This week I will finish:",
    prompts: [
      "What did you finish today, however small?",
      "What have you been carrying that could be done in ten minutes?",
      "List three things you did this month that you have not credited yourself for.",
      "What habit is quietly working, even though it feels unremarkable?",
      "What did you say no to recently that protected your time?",
      "What is one thing you are better at than you were a year ago?",
      "Who would notice your small wins if you told them? Tell them.",
    ],
  },
  {
    hil: "Ang mga Tawo", en: "The People",
    quote: "Coffee tastes better across a table from someone.",
    reflect: "The people who shaped you are mostly not famous and mostly did not know they were doing it. This week, remember them properly, and reach out to one.",
    intention: "This week I will reconnect with:",
    prompts: [
      "Who has changed your life the most without ever being thanked for it?",
      "Which friendship have you let go quiet? Is that a choice or an accident?",
      "What do people come to you for? How do you feel about that?",
      "Who do you feel most yourself around, and why is that?",
      "Write something you would want a loved one to know if you could not say it in person.",
      "What relationship needs a boundary more than it needs more effort?",
      "Who would you like to know better? What is stopping you?",
    ],
  },
  {
    hil: "Pagbuhi", en: "Letting Go",
    quote: "You are allowed to put the cup down.",
    reflect: "Some things you carry because you once needed them, and you never checked whether you still do. Set one down and see whether anything actually falls.",
    intention: "This week I am setting down:",
    prompts: [
      "What are you still angry about that no longer serves you?",
      "What plan are you following that you never actually chose?",
      "Who do you need to forgive — including possibly yourself?",
      "What do you own, physically, that you keep only out of guilt?",
      "What identity are you outgrowing?",
      "What would you stop doing if nobody would be disappointed?",
      "What is one thing you can decide, today, is finished?",
    ],
  },
  {
    hil: "Pagpaabot", en: "Patience",
    quote: "Good coffee is mostly waiting.",
    reflect: "Patience is not passive. It is the active decision not to yank something out of the ground to check the roots.",
    intention: "This week I am waiting well for:",
    prompts: [
      "What are you waiting for, and how are you spending the wait?",
      "What in your life is growing slowly and quietly right now?",
      "When did impatience cost you something?",
      "What would you tell a friend who was where you are, wanting it faster?",
      "What is worth another six months of effort?",
      "What can you enjoy today that has nothing to do with the outcome you want?",
      "Where are you further along than you were, without having noticed it?",
    ],
  },
  {
    hil: "Kalipay", en: "Joy",
    quote: "Delight is not frivolous. It is fuel.",
    reflect: "The serious things go better when there is joy in the week. Write the small delights down so they do not evaporate by Friday.",
    intention: "This week I am making room for:",
    prompts: [
      "What made you laugh most recently? Write the whole story.",
      "What did you love doing when you were ten? Could you do a version of it now?",
      "What is a small pleasure you deny yourself for no good reason?",
      "Where do you feel most at ease in your city?",
      "What music makes the day better? When did you last put it on deliberately?",
      "What is beautiful about where you are sitting right now?",
      "Plan one genuinely delightful hour this week. What is in it?",
    ],
  },
  {
    hil: "Kusog", en: "Strength",
    quote: "You have survived every hardest day so far.",
    reflect: "Whatever you are facing, there is a version of you in the past who faced something that felt just as impossible, and you are still here. That is a track record.",
    intention: "This week I am drawing strength from:",
    prompts: [
      "What is the hardest thing you have already survived?",
      "What did that season teach you that you still use?",
      "Who did you become because of a difficulty you did not choose?",
      "What do you do when things get heavy? Is it working?",
      "What support do you need right now but have not asked for?",
      "What would you tell someone who is now facing what you faced two years ago?",
      "What is one piece of evidence that you are stronger than you feel today?",
    ],
  },
  {
    hil: "Puluy-an", en: "Home",
    quote: "Home is the smell of coffee and someone calling your name.",
    reflect: "Home is partly a place and mostly a set of small familiar things. Notice yours this week — they cost nothing now and you will miss them one day.",
    intention: "This week I am tending to:",
    prompts: [
      "What makes a place feel like home to you?",
      "Which corner of your home do you love most, and why?",
      "What smell takes you straight back to childhood?",
      "What is one small change that would make your daily space kinder to you?",
      "Who feels like home, regardless of the place?",
      "What tradition from your family do you want to keep? Which do you not?",
      "What would you want a guest to feel within five minutes of arriving?",
    ],
  },
  {
    hil: "Sidlak", en: "Shine",
    quote: "Sip. Smile. Shine. In that order, and on ordinary days.",
    reflect: "Shining is not performing. It is what happens when you stop shrinking. Look back at what you have written — something in there is already glowing.",
    intention: "This week I am stepping into:",
    prompts: [
      "Read back through your entries. What surprised you?",
      "What changed in you over these twelve weeks?",
      "What are you noticeably better at now?",
      "What do you want to carry into the next twelve weeks?",
      "Where have you been hiding, and what would it cost to stop?",
      "What do you want to be known for among the people close to you?",
      "Write a note to yourself for one year from today.",
    ],
  },
];

export const MOODS = ["heavy", "low", "ordinary", "good", "bright"];

/* Where the stress slider lands when a mood is chosen, so the two never start
   out contradicting each other. Index matches MOODS. The reader can always drag
   the slider afterwards, and once they do, picking a mood stops moving it. */
export const MOOD_STRESS = [8, 6, 5, 3, 2];
export const TOTAL_DAYS = 84;

export const weekOf = (day) => Math.min(WEEKS.length - 1, Math.floor((day - 1) / 7));
export const dayInWeek = (day) => (day - 1) % 7;
