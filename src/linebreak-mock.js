// linebreakモジュールの完全なモック

// シンプルなlinebreaker実装
class LineBreaker {
  constructor(text) {
    this.text = text || '';
    this.pos = 0;
  }

  nextBreak() {
    if (this.pos >= this.text.length) {
      return null;
    }

    // 簡単な改行検出（実際のUnicodeルールは使用しない）
    const remainingText = this.text.slice(this.pos);
    
    // スペースか改行文字で分割
    const spaceMatch = remainingText.search(/[\s\n\r]/);
    const breakPos = spaceMatch === -1 ? remainingText.length : spaceMatch;
    
    const result = {
      position: this.pos + breakPos,
      required: remainingText[breakPos] === '\n' || remainingText[breakPos] === '\r'
    };
    
    this.pos = result.position + 1;
    return result;
  }
}

// linebreakモジュールのエクスポート
function linebreakFunction(text) {
  return new LineBreaker(text);
}

// デフォルトエクスポート
export default linebreakFunction;

// 名前付きエクスポートもサポート
export { LineBreaker };
export { linebreakFunction as linebreak };