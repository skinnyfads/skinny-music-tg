function getPayload(text: String) {
  return text.split(" ").slice(1).join(" ");
}

export default getPayload;
