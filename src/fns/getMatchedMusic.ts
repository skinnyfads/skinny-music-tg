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

function tokenSimilarity(stringX: string, stringY: string) {
  const tokenize = (str: string) =>
    str
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 0);

  const tokensX = tokenize(stringX);
  const tokensY = tokenize(stringY);
  let matchCount = 0;

  for (const tokenX of tokensX) {
    for (const tokenY of tokensY) {
      const similarity = getSimilarity(tokenX, tokenY);
      if (similarity > 0.8) {
        matchCount++;
        break;
      }
    }
  }

  const totalTokens = tokensX.length + tokensY.length;
  return matchCount / (totalTokens / 2);
}

function getMatchedMusic(searchResult: TracksV2, query: string) {
  const similarities = searchResult.items.map((item) => {
    const trackResult = item.item.data;
    const trackResultArtists = trackResult.artists.items.map((item) => item.profile.name);
    const result = trackResult.name + " " + trackResultArtists.join(" ");
    const similarity = tokenSimilarity(result, query);

    return { item, similarity };
  });
  similarities.sort((x, y) => y.similarity - x.similarity);

  return similarities[0].item.item.data;
}

export default getMatchedMusic;
