Hooks.once("init", async () => {
  await setDefaultSettings();
});

Hooks.on("createChatMessage", (messageData) => {
  if (messageData.content.match(/\^\^#(.*?)\^\^/g)) {
    parseInlineTables(messageData);
  }
});

/**
 * @param {ChatMessage} messageData - The chat message data
 */
async function parseInlineTables(messageData) {
  const { content } = messageData;
  const tableChatMessage = game.messages.get(messageData._id);
  if (tableChatMessage.author._id !== game.userId) return;
  const newContent = await handleMatches(content);
  const enrichedContent = await TextEditor.enrichHTML(newContent);
  await tableChatMessage.update({ content: enrichedContent });
}

/**
 * @param {string} content - The content of the identified chat message
 * @returns {string} - The content with the table results inserted
 *
 * This function is recursive, it stops when the content no longer
 * contaisn a match.
 */
async function handleMatches(content, depth = 0) {
  if (depth > 10) {
    ui.notifications?.warn(
      `Help I'm trapped in a loop! You're calling the same table in a lower table.`
    );
    throw new Error(
      `Help I'm trapped in a loop! You're calling the same table in a lower table.`
    );
  }
  const matches = content.matchAll(
    /(?<fullString>\^\^(?:\?(?<number>\d+d?\d*)\?)?#(?<tableName>.*?)\^\^)/g
  );

  let hasMatches = false;

  for (const match of matches) {
    if (match.groups.number === undefined) {
      match.groups.number = "1";
    }
    content = await getResults(content, match.groups);
    hasMatches = true;
  }

  if (!hasMatches) {
    // We found no matches, do not recurse
    return content;
  }

  depth += 1;
  return handleMatches(content, depth);
}

/**
 * This function takes match from the regex, determines how many times to roll the table,
 * finds the table, rolls it, and replaces the match with the result.
 *
 * @param {string} content - The content of the chat message
 * @param {string} match - The match from the regex
 * @returns {string} - The content with the match replaced with the results of the table
 */
async function getResults(content, match) {
  const numberToDraw = await new Roll(match.number).roll();
  const table = await findTable(match.tableName);
  const results = await table.drawMany(Number(numberToDraw.total), {
    displayChat: false,
  });
  let resultArray = [];
  for (const result of results.results) {
    resultArray.push(await result.getHTML());
  }
  const formattedResult = formatResult(resultArray);
  let newContent = content.replace(match.fullString, formattedResult);
  return newContent;
}

/**
 * @param {string[]} result - The result of the table roll
 * @returns {string} - The formatted result
 */
function formatResult(result) {
  const formatMultipleResults = game.settings.get(
    "Inline-Table-Rolls",
    "format-multiple-results"
  );
  if (formatMultipleResults) {
    const lf = new Intl.ListFormat("en");
    return lf.format(result);
  }
  return result.join(" ");
}

/**
 * @param {string} name - The name of the table
 * @returns {RollTable} - The RollTable object
 */
async function findTable(name) {
  let table = null;
  if (game.tables.getName(name)) {
    table = game.tables.getName(name);
  } else {
    const pack = game.packs.find((p) => {
      if (p.metadata.type !== "RollTable") return false;
      return !!p.index.getName(name);
    });
    if (pack) {
      let entry = pack.index.getName(name);
      table = await pack.getDocument(entry._id);
    }
  }
  if (!table) {
    ui.notifications?.warn(`Table ${name} not found.`);
    throw new Error(`Table ${name} not found.`);
  }
  return table;
}

async function setDefaultSettings() {
  const defaultSettings = [
    {
      id: "format-multiple-results",
      name: "Format Multiple Results",
      hint: "Determines whether the module will format multiple results from a table with commas and conjunctions.",
      type: Boolean,
      default: true,
    },
  ];
  for (const setting of defaultSettings) {
    game.settings.register("Inline-Table-Rolls", setting.id, {
      name: setting.name,
      hint: setting.hint,
      scope: "world",
      config: true,
      type: setting.type,
      default: setting.default,
    });
  }
}
