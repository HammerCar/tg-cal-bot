require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.TG_TOKEN;
const bot = new TelegramBot(token);

const main = async () => {
  console.log("Setting up chat menu button");
  await bot.setChatMenuButton({
    menu_button: {
      type: "web_app",
      text: "Create event",
      web_app: {
        url: "https://laptop-dev.tear.fi/events/create",
      },
    },
  });
};

main();
