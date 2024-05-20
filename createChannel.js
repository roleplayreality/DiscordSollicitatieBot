const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('@discordjs/builders')
const {ButtonStyle, ChannelType, PermissionsBitField} = require('discord.js')
const { logIntaketoChannel } = require('./logger.js');

require('dotenv').config();


async function createNewChannel (client, guild, department, results, channelName, ticketId) {
    const trimmedDepartment = department.trim();
    const discordUser = await guild.members.fetch(results.discord)
    const channelN = await guild.channels.create({
        name: `intake-${ticketId}-${trimmedDepartment}`,
        type: ChannelType.GuildText,
        topic: "0",
        parent: process.env.CATEGORY_ID,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: discordUser,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            },
            {
                id: process.env.AM_ROLE_ID,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            },
            {
                id: process.env.OM_ROLE_ID,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] 
            },
            {
                id: process.env[`${trimmedDepartment.toUpperCase()}_ROLE_ID`], 
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] 
            },
            {
                id: client.application.id, 
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] 
            }
        ]
    })
    //Reformat the birthdate
    const birthdate = new Date(results.birthdate)
    const day = birthdate.getDate();
    const month = birthdate.getMonth() + 1;
    const year = birthdate.getFullYear();
    const formattedBirthdate = (day < 10 ? '0' : '') + day + '-' + (month < 10 ? '0' : '') + month + '-' + year;
    //Create the embed
    const welcomeEmbed = new EmbedBuilder()
        .setColor([0, 255, 0])
        .setDescription(`Hi <@${results.discord}>, \n\n${process.env.WELCOME_MESSAGE} \n\n**Wat is je voornaam?** \n \`\`\`${results.voornaam}\`\`\` \n**Wat is je achternaam?** \n \`\`\`${results.achternaam}\`\`\` \n**Wat is je geboortedatum?** \n \`\`\`${formattedBirthdate}\`\`\` \n**Op welk e-mailadres heb je gesolliciteerd?** \n \`\`\`${results.email}\`\`\` \n${process.env.TIME_MESSAGE}`)
        .setFooter({ text: process.env.FOOTER_MESSAGE, iconURL: process.env.FOOTER_IMAGE });

    // Get the member object from interaction
    const member = await guild.members.fetch(results.discord);

    // Check if the member has any of the required roles
    const hasRequiredRole = await member.roles.cache.get(process.env.AM_ROLE_ID) || 
                            await member.roles.cache.get(process.env.OM_ROLE_ID) ||
                            await member.roles.cache.get(process.env[`${trimmedDepartment.toUpperCase()}_ROLE_ID`]);

    // Dynamically set the disabled property based on role check
    const buttonRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('plan_date_button')
                .setLabel('Gesprek inplannen')
                .setStyle(ButtonStyle.Success)
                .setDisabled(false) // Disable if the member doesn't have the required roles
    );

    await channelN.send({content: `||<@${results.discord}> <@&${process.env[`${trimmedDepartment.toUpperCase()}_ROLE_ID`]}> <@&${process.env.OM_ROLE_ID}> ||`,embeds:[welcomeEmbed], components: [buttonRow]})

    logIntaketoChannel(client, `Created channel (<#${channelN.id}> ${channelN.name}) for <@${results.discord}> (${results.discord})`, [0, 255, 0])
}

module.exports = {createNewChannel}