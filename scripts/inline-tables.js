Hooks.on("createChatMessage", (a) => {
  if (a.data.content.match(/\[\[\#(.*?)\]\]/g)) parseInlineTables(a);
});

const parseInlineTables = async (a) => {
  let content = { ...a.data }.content;
  let finalId = a.data._id;
  let depth = 0;
  let newContent = await handleMatches(content, depth);
  let theMessage = game.messages.get(finalId);
  if (theMessage.data.user === game.userId) {
    await theMessage.update({ content: newContent })
  };
};

const handleMatches = async (content, depth) => {
  if (depth > 10) {
    throw new Error(
      `Help I'm trapped in a loop! You're calling the same table in a lower table.`
    );
  }
  let matches = content.match(/\[\[\#(.*?)\]\]/g);
  const lf = new Intl.ListFormat("en");
  if (matches != null) {
    for (let match of matches) {
      let table = match.replace(`[[#`, ``).replace(`]]`, ``);
      let roll = await game.tables.getName(table).roll();
      let resArray = [];
      for (let result of roll.results) {
        resArray.push(result.getChatText());
      }
      content = content.replace(match, lf.format(resArray));
    }
    depth += 1;
    return handleMatches(content, depth);
  } else if (matches == null) {
    return content;
  }
};
