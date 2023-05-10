import { TracksV2 } from "spotifyds-core/dist/interfaces/search.js";

function editDistance(stringX: string, stringY: string) {
  stringX = stringX.toLowerCase();
  stringY = stringY.toLowerCase();

  const costs: number[] = new Array();

  for (let i = 0; i <= stringX.length; i++) {
    let lastValue = i;

    for (let j = 0; j <= stringY.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];

          if (stringX.charAt(i - 1) != stringY.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[stringY.length] = lastValue;
  }
  return costs[stringY.length];
}
function getSimilarity(stringX: string, stringY: string) {
  let longer = stringX;
  let shorter = stringY;

  if (stringX.length < stringY.length) {
    longer = stringY;
    shorter = stringX;
  }
  const longerLength = longer.length;

  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength.toFixed(1));
}
function getMatchedMusic(result: TracksV2, query: string) {
  const similarities = result.items.map((item) => {
    const similarity = getSimilarity(item.item.data.name, query);
    return { item, similarity };
  });
  similarities.sort((x, y) => y.similarity - x.similarity);

  return similarities[0].item.item.data;
}

export default getMatchedMusic;
