import isUrl from 'is-url'
import Post from '../models/post'
import { getIdFromUrl, isUserInChannel } from '../utils'

// /prox delete <post number|url>
export default async (bot, message, args) => {
    // Check if the user is part of the review channel
    if (!(await isUserInChannel(bot.api, message.user, process.env.SLACK_REVIEW_CHANNEL_ID))) {
        await bot.replyEphemeral(message, 'You don’t have permission to run this command.')
        return
    }

    if (!args[1]) {
        await bot.replyEphemeral(message, 'Please specify a post number or message URL.')
        return
    }

    // Check if target is post or thread reply
    let messageId
    let post
    if (isUrl(args[1])) { // Is URL?
        messageId = getIdFromUrl(args[1])
        if (!messageId) {
            await bot.replyEphemeral(message, 'Couldn’t extract a message ID from the given URL.')
            return
        }

        // Attempt to find a post the link was pointing to
        post = await Post.findOne({ postMessageId: messageId })
    } else if (!isNaN(args[1])) { // Is post number?
        post = await Post.findOne({ postNumber: args[1] })
        if (!post) {
            await bot.replyEphemeral(message, 'The specified post couldn’t be found.')
            return
        }

        messageId = post.postMessageId
    } else { // Is invalid input
        await bot.replyEphemeral(message, 'Input must be a post number or message URL.')
        return
    }

    // Delete the message using retrieved ID
    try {
        const updatedMessage = {
            id: messageId,
            conversation: { id: process.env.SLACK_POST_CHANNEL_ID },
            text: `:skull: ${post ? `*#${post.postNumber}:* _This post` : '_This message'} has been deleted._`
        }
        await bot.updateMessage(updatedMessage)
        await bot.replyEphemeral(message, 'Message deleted.')
    } catch (e) {
        await bot.replyEphemeral(message, `Failed to delete. Reason: \`${e.data.error}\``)
    }
}
