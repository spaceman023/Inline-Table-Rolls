Hooks.on('createChatMessage', (a) => {
  if (a.data.content.match(/\[\[#(.*?)\]\]/g)) parseInlineTables(a);
});

async function parseInlineTables(a) {
  let { content } = { ...a.data };
  const finalId = a.data._id;
  const depth = 0;
  let newContent = await handleMatches(content, depth);
  const theMessage = game.messages.get(finalId);
  if (theMessage.data.user === game.userId) {
    await theMessage.update({ content: newContent });
    newContent = theMessage.data.content;
    await theMessage.delete();
    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker(),
      content: newContent,
    });
  }
}

async function handleMatches(content, depth) {
  if (depth > 10) {
    throw new Error(`Help I'm trapped in a loop! You're calling the same table in a lower table.`);
  }
  const matches = content.match(/\[\[#(.*?)\]\]/g);
  if (matches != null) {
    for (const match of matches) {
      content = await rollTableAndReplaceContent(content, match);
    }
    depth += 1;
    return handleMatches(content, depth);
  }
  return content;
}
async function rollTableAndReplaceContent(content, match) {
  let table = match.replace(`[[#`, ``).replace(`]]`, ``);
  let roll;
  const resArray = [];
  const lf = new Intl.ListFormat('en');
  if (!game.tables.getName(table)) {
    table = await findCompendiumTable(table);
  } else {
    table = game.tables.getName(table);
  }
  if (table) {
    roll = await table.roll();
  } else {
    throw new Error('Table not found');
  }
  for (const result of roll.results) {
    resArray.push(result.getChatText());
  }
  return content.replace(match, lf.format(resArray));
}
async function findCompendiumTable(name) {
  const pack = game.packs.find((p) => {
    if (p.index.getName(name)) {
      return true;
    }
    return false;
  });
  if (!pack) {
    return null;
  }
  const entry = pack.index.getName(name);
  const table = await pack.getDocument(entry._id);
  return table;
}
