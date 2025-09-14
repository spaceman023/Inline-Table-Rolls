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
  console.log("=== parseInlineTables START ===");
  console.log("Original message content:", messageData.content);

  const { content } = messageData;
  const tableChatMessage = game.messages.get(messageData._id);
  if (tableChatMessage.author._id !== game.userId) return;

  console.log("Processing message from user:", game.userId);
  const newContent = await handleMatches(content, new Set());
  console.log("Final processed content:", newContent);

  const enrichedContent = await TextEditor.enrichHTML(newContent);
  console.log("Enriched content:", enrichedContent);

  await tableChatMessage.update({ content: enrichedContent });
  console.log("=== parseInlineTables END ===");
}

/**
 * @param {string} content - The content of the identified chat message
 * @param {Set} calledTables - Set of table names that have been called in this recursion chain
 * @returns {string} - The content with the table results inserted
 *
 * This function is recursive, it stops when the content no longer
 * contains a match or when a table recursion loop is detected.
 */
async function handleMatches(content, calledTables = new Set()) {
  console.log(`--- handleMatches ---`);
  console.log("Input content:", content);
  console.log("Called tables so far:", Array.from(calledTables));

  const matches = content.matchAll(
    /(?<fullString>\^\^#(?:\?(?<number>\d+d?\d*)\?)?(?<tableName>.*?)\^\^)/g
  );

  const matchArray = Array.from(matches);
  console.log("Found", matchArray.length, "matches:", matchArray.map(m => m.groups.fullString));

  let hasMatches = false;

  for (const match of matchArray) {
    console.log("Processing match:", {
      fullString: match.groups.fullString,
      originalNumber: match.groups.number,
      tableName: match.groups.tableName
    });

    // Check for recursive table call
    if (calledTables.has(match.groups.tableName)) {
      console.log("ERROR: Recursive table call detected for:", match.groups.tableName);
      ui.notifications?.warn(
        `Recursive table call detected! Table "${match.groups.tableName}" is calling itself.`
      );
      throw new Error(
        `Recursive table call detected! Table "${match.groups.tableName}" is calling itself.`
      );
    }

    if (match.groups.number === undefined || match.groups.number === null || match.groups.number.trim() === "") {
      console.log("Number was empty/undefined, setting to '1'");
      match.groups.number = "1";
    }

    console.log("Final match object:", match.groups);

    // Add this table to the called tables set
    const newCalledTables = new Set(calledTables);
    newCalledTables.add(match.groups.tableName);
    console.log("Adding table to recursion chain:", match.groups.tableName);

    content = await getResults(content, match.groups, newCalledTables);
    hasMatches = true;
    console.log("Content after processing this match:", content);
  }

  if (!hasMatches) {
    console.log("No matches found, returning content");
    return content;
  }

  console.log("Recursing with called tables:", Array.from(calledTables));
  return handleMatches(content, calledTables);
}

/**
 * This function takes match from the regex, determines how many times to roll the table,
 * finds the table, rolls it, and replaces the match with the result.
 *
 * @param {string} content - The content of the chat message
 * @param {Object} match - The match object from the regex
 * @param {Set} calledTables - Set of table names called in this recursion chain
 * @returns {string} - The content with the match replaced with the results of the table
 */
async function getResults(content, match, calledTables) {
  console.log("*** getResults START ***");
  console.log("Match object received:", match);
  console.log("Dice expression to roll:", match.number);
  console.log("Table name to find:", match.tableName);
  console.log("Full string to replace:", match.fullString);

  let numberToDraw;
  try {
    console.log("Creating Roll with expression:", match.number);
    const roll = new Roll(match.number);
    console.log("Roll created successfully, rolling...");
    numberToDraw = await roll.roll();
    console.log("Roll result:", numberToDraw.total, "from expression:", match.number);
  } catch (error) {
    console.log("ERROR: Failed to create/roll dice:", error);
    ui.notifications?.warn(`Invalid dice expression: ${match.number}`);
    throw new Error(`Invalid dice expression: ${match.number}`);
  }

  console.log("Looking for table:", match.tableName);
  const table = await findTable(match.tableName);
  console.log("Found table:", table.name);

  console.log("Drawing", numberToDraw.total, "results from table");
  const results = await table.drawMany(Number(numberToDraw.total), {
    displayChat: false,
  });
  console.log("Raw results from table:", results.results.length, "items");

  let resultArray = [];
  for (const result of results.results) {
    let resultContent;

    // Check Foundry version for backward compatibility
    const foundryVersion = parseInt(game.version || game.data?.version);
    console.log("Foundry version detected:", foundryVersion);

    if (foundryVersion >= 13) {
      // V13+: Use getHTML()
      console.log("Using getHTML() for V13+");
      resultContent = await result.getHTML();
    } else {
      // V12 and earlier: Use getChatText()
      console.log("Using getChatText() for V12 and earlier");
      resultContent = result.getChatText();
    }

    console.log("Individual result content:", resultContent);
    resultArray.push(resultContent);
  }

  console.log("All result HTML strings:", resultArray);
  const formattedResult = formatResult(resultArray);
  console.log("Formatted result:", formattedResult);

  console.log("Replacing in content:");
  console.log("  FROM:", match.fullString);
  console.log("  TO:", formattedResult);

  let newContent = content.replace(match.fullString, formattedResult);
  console.log("New content after replacement:", newContent);
  console.log("*** getResults END ***");
  return newContent;
}

/**
 * @param {string[]} result - The result of the table roll
 * @returns {string} - The formatted result
 */
function formatResult(result) {
  console.log(">>> formatResult START <<<");
  console.log("Input result array:", result);

  // Clean up HTML content by removing all whitespace characters including newlines, tabs, etc.
  const cleanedResult = result.map((item, index) => {
    console.log(`Cleaning item ${index}:`, JSON.stringify(item));
    const cleaned = item.trim().replace(/[\r\n\t\f\v]/g, '').replace(/\s+/g, ' ');
    console.log(`Cleaned item ${index}:`, JSON.stringify(cleaned));
    return cleaned;
  });

  console.log("All cleaned results:", cleanedResult);

  // Always use simple space separation
  console.log("Joining results with spaces");
  const finalResult = cleanedResult.join(" ");

  console.log("Final formatted result:", JSON.stringify(finalResult));
  console.log(">>> formatResult END <<<");
  return finalResult;
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
  // No settings currently needed
}
