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

// ---------- Helpers ----------
const loadJSON = (file, def) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(def));
  return JSON.parse(fs.readFileSync(file));
};
const saveJSON = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ---------- Ready ----------
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ---------- Message Handler ----------
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const blockedWords = loadJSON(WORDS_FILE, {});
  const whitelist = loadJSON(WHITELIST_FILE, []);

  // ===== ADMIN COMMANDS =====
  if (message.content.startsWith(PREFIX)) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();

    // ADD WORD
    if (cmd === "addword") {
      const word = args.shift();
      const reason = args.join(" ") || "This word is blocked.";
      if (!word) return message.reply("❌ `%addword <word> <reason>`");

      blockedWords[word.toLowerCase()] = reason;
      saveJSON(WORDS_FILE, blockedWords);
      return message.reply(`✅ Blocked **${word}**`);
    }

    // REMOVE WORD
    if (cmd === "removeword") {
      const word = args.shift()?.toLowerCase();
      if (!blockedWords[word]) return message.reply("❌ Word not found");

      delete blockedWords[word];
      saveJSON(WORDS_FILE, blockedWords);
      return message.reply(`✅ Unblocked **${word}**`);
    }

    // LIST WORDS
    if (cmd === "listwords") {
      const list = Object.entries(blockedWords);
      if (!list.length) return message.reply("No banned words.");

      return message.reply(
        "🚫 **Banned Words:**\n" +
          list.map(([w, r]) => `• **${w}** → ${r}`).join("\n")
      );
    }

    // WHITELIST ADD
    if (cmd === "whitelistadd") {
      const user = message.mentions.users.first();
      if (!user) return message.reply("❌ Mention a user.");

      if (!whitelist.includes(user.id)) {
        whitelist.push(user.id);
        saveJSON(WHITELIST_FILE, whitelist);
      }
      return message.reply(`✅ ${user.tag} whitelisted`);
    }

    // WHITELIST REMOVE
    if (cmd === "whitelistremove") {
      const user = message.mentions.users.first();
      if (!user) return message.reply("❌ Mention a user.");

      saveJSON(
        WHITELIST_FILE,
        whitelist.filter((id) => id !== user.id)
      );
      return message.reply(`✅ ${user.tag} removed from whitelist`);
    }

    // WHITELIST LIST
    if (cmd === "whitelist") {
      if (!whitelist.length) return message.reply("Whitelist empty.");
      return message.reply(
        "✅ **Whitelisted Users:**\n" +
          whitelist.map((id) => `<@${id}>`).join("\n")
      );
    }
  }

  // ===== WORD FILTER =====
  if (whitelist.includes(message.author.id)) return;

  const content = message.content.toLowerCase();

  for (const word in blockedWords) {
    const regex = new RegExp(`\\b${word}\\b`, "i"); // WHOLE WORD MATCH
    if (regex.test(content)) {
      await message.delete().catch(() => {});
      await message.author.send(
        `🚫 **Message Blocked**\n\n**Word:** ${word}\n**Reason:** ${blockedWords[word]}`
      ).catch(() => {});
      break;
    }
  }
});

client.login(process.env.TOKEN);
