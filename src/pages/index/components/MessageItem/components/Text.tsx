import React from 'react'
import Taro from '@tarojs/taro'
import {isPhone, parseMarkdown} from "@/util";
import {View} from "@tarojs/components";

const Index: React.FC<{
  content: string
}> = props => {

  const makePhoneCall = React.useCallback((content: string) => {
    if (isPhone(content)) {
      Taro.makePhoneCall({
        phoneNumber: content
      })
    }
  } ,[])

  return React.useMemo(() => {
    // 解析markdown内容，如果解析失败则显示原始文本
    let parsedContent;
    try {
      parsedContent = parseMarkdown(props.content);
    } catch (error) {
      console.warn('Markdown parsing failed, showing raw text:', error);
      parsedContent = <span onClick={() => makePhoneCall(props.content)}>{props.content}</span>;
    }

    return (
      <View className={"break-all text-base py-1 px-1"}>
        {parsedContent}
      </View>
    );
  } ,[makePhoneCall, props.content])
}
export default Index
