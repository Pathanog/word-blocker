const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

const PREFIX = "%";
const WORDS_FILE = "./blockedWords.json";
const WHITELIST_FILE = "./whitelist.json";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// ===== IN-MEMORY CACHE =====
let blockedWords = {};
let whitelist = [];
let blockRegex = null;

// ===== LOAD DATA ONCE =====
function loadData() {
  blockedWords = fs.existsSync(WORDS_FILE)
    ? JSON.parse(fs.readFileSync(WORDS_FILE))
    : {};

  whitelist = fs.existsSync(WHITELIST_FILE)
    ? JSON.parse(fs.readFileSync(WHITELIST_FILE))
    : [];

  rebuildRegex();
}

// ===== BUILD SINGLE REGEX =====
function rebuildRegex() {
  const words = Object.keys(blockedWords);
  if (!words.length) {
    blockRegex = null;
    return;
  }

  // Escape regex safely
  const escaped = words.map(w =>
    w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  blockRegex = new RegExp(`\\b(${escaped.join("|")})\\b`, "i");
}

// ===== SAVE ASYNC =====
function saveWords() {
  fs.writeFile(WORDS_FILE, JSON.stringify(blockedWords, null, 2), () => {});
}
function saveWhitelist() {
  fs.writeFile(WHITELIST_FILE, JSON.stringify(whitelist, null, 2), () => {});
}

// ===== READY =====
client.once("ready", () => {
  loadData();
  console.log(`✅ Strong bot online as ${client.user.tag}`);
});

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  // ===== ADMIN COMMANDS =====
  if (message.content.startsWith(PREFIX)) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();

    if (cmd === "addword") {
      const word = args.shift();
      const reason = args.join(" ") || "This word is blocked.";
      if (!word) return message.reply("❌ `%addword <word> <reason>`");

      blockedWords[word.toLowerCase()] = reason;
      saveWords();
      rebuildRegex();

      return message.reply(`✅ Blocked **${word}**`);
    }

    if (cmd === "removeword") {
      const word = args.shift()?.toLowerCase();
      if (!blockedWords[word]) return message.reply("❌ Word not found.");

      delete blockedWords[word];
      saveWords();
      rebuildRegex();

      return message.reply(`✅ Unblocked **${word}**`);
    }

    if (cmd === "listwords") {
      const list = Object.keys(blockedWords);
      return message.reply(
        list.length
          ? "🚫 **Banned Words:**\n" + list.join(", ")
          : "No banned words."
      );
    }

    if (cmd === "whitelistadd") {
      const user = message.mentions.users.first();
      if (!user) return message.reply("❌ Mention a user.");

      if (!whitelist.includes(user.id)) {
        whitelist.push(user.id);
        saveWhitelist();
      }
      return message.reply(`✅ ${user.tag} whitelisted`);
    }

    if (cmd === "whitelistremove") {
      const user = message.mentions.users.first();
      whitelist = whitelist.filter(id => id !== user.id);
      saveWhitelist();
      return message.reply(`✅ ${user.tag} removed`);
    }

    if (cmd === "whitelist") {
      return message.reply(
        whitelist.length
          ? whitelist.map(id => `<@${id}>`).join("\n")
          : "Whitelist empty."
      );
    }
  }

  // ===== FAST WORD CHECK =====
  if (!blockRegex) return;
  if (whitelist.includes(message.author.id)) return;

  const match = message.content.match(blockRegex);
  if (!match) return;

  const word = match[1].toLowerCase();

  await message.delete().catch(() => {});
  await message.author.send(
    `🚫 **Message Blocked**\n\n**Word:** ${word}\n**Reason:** ${blockedWords[word]}`
  ).catch(() => {});
});

client.login(process.env.TOKEN);
