export class BaseUrl {
  static getAPIUrl() {
    // return `https://project-whatseasy-morning-frost-4625.fly.dev`
    return `http://localhost:3333`;
  }
  static getWSUrl() {
    // return `wss://project-whatseasy-morning-frost-4625.fly.dev/ws`
    return `ws://localhost:3333/ws`;
  }
}
