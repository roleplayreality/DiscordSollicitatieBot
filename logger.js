const fs = require('fs');
const { EmbedBuilder } = require('@discordjs/builders')


// Function to log messages to a file and send them to a Discord channel
async function logToChannel(client, type, message) {


    // Send the message to the specified Discord channel
    const channel = client.channels.cache.get(process.env.BOT_LOG_CHANNEL_ID);
    if (channel) {
        const logEmbed = new EmbedBuilder()
        if (type == "error") {
            logEmbed.setTitle(` `)
            logEmbed.setDescription(`A error came up: \`\`\`${message}\`\`\``)
            logEmbed.setColor([255, 0, 0]);
            await channel.send({ content: `<@everyone>`, embeds: [logEmbed] });
            console.error(message)
            // Log the message to a file
            fs.appendFile('errorLog.txt', `${new Date().toLocaleString()}: ${message}\n`, (err) => {
                if (err) {
                    console.error('Error writing to log file:', err);
                }
            });
            return;
        } else if (type == "online") {
            logEmbed.setTitle(`**${client.user.username}** is now online!`)
            logEmbed.setDescription(`\`\`\`ID: ${client.user.id} \nDiscriminator: ${client.user.discriminator}\`\`\``)
            logEmbed.setColor([0, 255, 0]);
        }
        logEmbed.setTimestamp();
        logEmbed.setFooter({ text: process.env.FOOTER_MESSAGE, iconURL: process.env.FOOTER_IMAGE });
        await channel.send({ embeds: [logEmbed] });
    } else {
        console.error('Invalid channel ID or channel type.');
    }
}

// Function to log messages to a file and send them to a Discord channel
function logIntaketoChannel(client, message, color) {
    // Log the message to a file
    fs.appendFile('intakeLog.txt', `${new Date().toLocaleString()}: ${message}\n`, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
    console.log(message)
    // Send the message to the specified Discord channel
    const channel = client.channels.cache.get(process.env.INTAKE_LOG_CHANNEL_ID);
    if (channel) {
        const intakeLogEmbed = new EmbedBuilder()
            .setColor(color)
            .setDescription(message)
            .setTimestamp()
            .setFooter({ text: process.env.FOOTER_MESSAGE, iconURL: process.env.FOOTER_IMAGE });
        channel.send({embeds:[intakeLogEmbed]})
    } else {
        console.error('Invalid channel ID or channel type.');
    }
}

module.exports = { logToChannel, logIntaketoChannel };