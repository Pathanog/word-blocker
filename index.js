const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

// ===== BOT CONFIG =====
const PREFIX = "%";
const WORDS_FILE = "./blockedWords.json";

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// ===== FILE HELPERS =====
function loadWords() {
  if (!fs.existsSync(WORDS_FILE)) {
    fs.writeFileSync(WORDS_FILE, "{}");
  }
  return JSON.parse(fs.readFileSync(WORDS_FILE, "utf8"));
}

function saveWords(data) {
  fs.writeFileSync(WORDS_FILE, JSON.stringify(data, null, 2));
}

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const words = loadWords();

  // ===== ADMIN COMMANDS =====
  if (message.content.startsWith(PREFIX)) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return;
    }

    const args = message.content.slice(PREFIX.length).trim().split(" ");
    const command = args.shift()?.toLowerCase();

    // ➕ ADD WORD
    if (command === "addword") {
      const word = args.shift();
      const reason = args.join(" ") || "This word is blocked in this server.";

      if (!word) {
        return message.reply("❌ Usage: `%addword <word> <reason>`");
      }

      words[word.toLowerCase()] = reason;
      saveWords(words);

      return message.reply(
        `✅ **Word Blocked**\n🔒 Word: \`${word}\`\n📄 Reason: ${reason}`
      );
    }

    // ➖ REMOVE WORD
    if (command === "removeword") {
      const word = args.shift()?.toLowerCase();

      if (!word || !words[word]) {
        return message.reply("❌ Word not found.");
      }

      delete words[word];
      saveWords(words);

      return message.reply(`✅ **Word Unblocked:** \`${word}\``);
    }

    // 📋 LIST WORDS
    if (command === "listwords") {
      const list = Object.entries(words);

      if (list.length === 0) {
        return message.reply("✅ No banned words set.");
      }

      const formatted = list
        .map(([w, r]) => `• **${w}** → ${r}`)
        .join("\n");

      return message.reply("🚫 **Banned Words:**\n" + formatted);
    }
  }

  // ===== WORD FILTER =====
  const content = message.content.toLowerCase();

  for (const word in words) {
    if (content.includes(word)) {
      try {
        await message.delete();

        await message.author.send(
          `🚫 **Message Blocked**\n\n` +
          `**Blocked Word:** ${word}\n` +
          `**Reason:** ${words[word]}`
        );
      } catch (err) {
        console.log("⚠️ Could not DM user.");
      }
      break;
    }
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
