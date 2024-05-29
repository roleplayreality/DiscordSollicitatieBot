const { Events, Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const mysql = require('mysql');
const discordTransripts = require('discord-html-transcripts');
require('dotenv').config();
const { logToChannel, logIntaketoChannel } = require('./logger.js');
const { isValidDate, reformatDate, convertToSQLDateTime } = require('./utils.js');
const { createNewChannel } = require('./createChannel.js')


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent] });


const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

client.once('ready', () => {
    console.log('Bot is online!');
    logToChannel(client, "online")
    checkAcceptedStatus()
});

async function checkAcceptedStatus() {
    const query = 'SELECT * FROM aanmeldingen WHERE accepted = 2 ORDER BY id ASC';

    try {
        const results = await new Promise((resolve, reject) => {
            pool.query(query, (error, results, fields) => {
                if (error) {
                    logToChannel(client, error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (results.length === 0) {
            console.log('No accepted entries found in the database.');
            return;
        }

        for (let i = 0; i < results.length; i++) {
            if (results[i].discord) {
                try {
                    const guild = client.guilds.cache.get(process.env.GUILD_ID);
                    const banList = await guild.bans.fetch();
                    const targetId = banList.get(results[i].discord)
                    if (targetId) {
                        //User is not in the server, no logging to prevent spamming
                    } else {
                        try {
                            const user = await guild.members.fetch(results[i].discord).then(() => true).catch(() => false);
                            if (user) {
                                const ticketId = results[i].id
                                const department = results[i].department.toLowerCase();
                                const trimmedDepartment = department.trim();
                                const channelName = `intake-${ticketId}-${trimmedDepartment}`;
                                // Check if there's already a channel with the same ticketId but different department
                                const existingChannel = guild.channels.cache.find(channel => {
                                    const existingTicketId = channel.name.split('-')[1];
                                    const existingDepartment = channel.name.split('-')[2];
                                    return existingTicketId === ticketId && existingDepartment !== trimmedDepartment;
                                });
                                if (existingChannel) {
                                    // Delete the old channel
                                    await existingChannel.send(process.env.DEPARTMENT_CHANGED_MESSAGE)
                                    const attachment = await discordTransripts.createTranscript(existingChannel, {
                                        limit: -1,
                                        returnType: 'attachment',
                                        filename: `${existingChannel.name}.html`,
                                        saveImages: true,
                                        footerText: "Exported {number} message{s}",
                                        poweredBy: false
                                    })
                                    logIntaketoChannel(client, `Intake channel (${existingChannel.name}, ${existingChannel.name}) for <@${results[i].discord}> (${results[i].discord}) automatically deleted, users's department was changed.`, [255, 0, 0], attachment)
                                    await existingChannel.delete();

                                    const channel = guild.channels.cache.find(channel => channel.name === channelName);

                                    if (channel) {

                                    } else {
                                        createNewChannel(client, guild, department, results[i], channelName, ticketId);
                                    }
                                } else {
                                    // Check if the channel exists with the specified name
                                    const channel = guild.channels.cache.find(channel => channel.name === channelName);

                                    if (channel) {

                                    } else {
                                        createNewChannel(client, guild, department, results[i], channelName, ticketId);
                                    }
                                }
                            } else {
                                //User is not in the server, no logging to prevent spamming
                            }
                        } catch (error) {
                            logToChannel(client, "error", error);
                            console.error(error);
                        }
                    }
                } catch (error) {
                    logToChannel(client, "error", error.stack);
                    console.error(error, error.stack);
                }
            }
        }
    } catch (error) {
        logToChannel(client, "error", error.stack);
        console.error(error, error.stack);
    }
}
setInterval(checkAcceptedStatus, process.env.CREATION_INTERVAL);

async function plannedIntake(interaction, formattedDate) {
    try {
        // Define getUserByDiscordId function
        async function getUserByDiscordId(discordId) {
            const query = 'SELECT * FROM aanmeldingen WHERE discord = ?';
            return new Promise((resolve, reject) => {
                pool.query(query, [discordId], (error, results, fields) => {
                    if (error) {
                        logToChannel(client, "error", error.stack)
                        reject(error, error.stack);
                    } else {
                        resolve(results[0]);
                    }
                });
            });
        }

        const discordId = interaction.message.mentions.users.first().id

        const user = await getUserByDiscordId(discordId);

        if (user) {
            const formatDate = convertToSQLDateTime(formattedDate);
            // Update appointment data in the callAppointment table for the user
            const updateQuery = 'UPDATE aanmeldingen SET callAppointment = ? WHERE discord = ?';
            pool.query(updateQuery, [formatDate, discordId], (error, results, fields) => {
                if (error) {
                    logToChannel(client, "error", error)
                    console.error('Error updating appointment data in callAppointment table:', error);
                } else {
                    const callPlannedEmbed = new EmbedBuilder()
                        .setTitle(`${process.env.APPOINTMENT_MESSAGE}${formattedDate}`)
                        .setColor([255, 0, 0])
                        .setDescription(`${process.env.CALL_PLANNED_MESSAGE}`, true)
                        .setFooter({ text: process.env.FOOTER_MESSAGE, iconURL: process.env.FOOTER_IMAGE });
                    const ts3InstallEmbed = new EmbedBuilder()
                        .setColor([0, 255, 0])
                        .setDescription(`[${process.env.TS3_INSTALL_MESSAGE}](${process.env.TS3_INSTALL_LINK})`)
                    const ts3HelpEmbed = new EmbedBuilder()
                        .setColor([0, 255, 0])
                        .setDescription(`[${process.env.TS3_HELP_MESSAGE}](${process.env.TS3_HELP_LINK})`)
                    interaction.message.channel.send({ content: `<@${discordId}>`, embeds: [callPlannedEmbed, ts3InstallEmbed, ts3HelpEmbed] })
                    logIntaketoChannel(client, `Intake for channel (<#${interaction.message.channel.id}>, ${interaction.message.channel.name}) for <@${discordId}> (${discordId}), succesfully planned with date; ${formattedDate}. By; <@${interaction.user.id}> (${interaction.user.id})`, [0, 95, 255])
                    //Reset the topic to 0 so it will still remind the users
                    if (interaction.message.channel.topic != "0") {
                        interaction.message.channel.setTopic('0')
                    }
                }
            });
        } else {
            console.log('User not found.');
        }
    } catch (error) {
        logToChannel(client, "error", error.stack)
        console.error('Error:', error, error.stack);
    }
}



client.on(Events.InteractionCreate, async interaction => {
    if (interaction.customId === 'plan_date_button') {
        if (interaction.member.roles.cache.has(process.env.INTAKE_ROLE_ID)) {
            await interaction.reply({ content: process.env.CANT_PLAN_MESSAGE, ephemeral: true });
            return;
        } else {
            try {
                const modal = new ModalBuilder()
                    .setCustomId('date_Modal')
                    .setTitle('Plan het intake gesprek in');

                const dateInput = new TextInputBuilder()
                    .setCustomId('dateInput')
                    .setLabel("Datum")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('12-06-2024 20:15')
                    .setRequired(true);

                const firstRow = new ActionRowBuilder().addComponents(dateInput)

                modal.addComponents(firstRow)

                await interaction.showModal(modal)

            } catch (error) {
                console.error('Error handling date input:', error, error.stack);
                logToChannel(client, "error", error.stack)
            }
        }
    }
    if (interaction.customId === 'date_Modal') {
        const dateInput = interaction.fields.getTextInputValue('dateInput');

        // Regular expression to match the format "DD-MM-YYYY HH:mm"
        const dateRegex = /^([0-2]\d|3[01])-(0\d|1[0-2])-(\d{4})\s+([01]\d|2[0-3]):([0-5]\d)$/;

        // Check if the date input matches the expected format
        if (dateRegex.test(dateInput)) {
            // Now parse the date string into a Date object for additional checks
            const [, day, month, year, hour, minute] = dateInput.match(dateRegex);
            const formattedDate = `${day}-${month}-${year} ${hour}:${minute}:00`;

            // Check if the parsed date is valid
            if (isValidDate(formattedDate)) {
                await interaction.reply({ content: `Je gesprek is ingepland met de volgende data: ${formattedDate}`, ephemeral: true });
                plannedIntake(interaction, formattedDate);
            } else {
                await interaction.reply({ content: 'Ongeldige datum.', ephemeral: true });
            }
        } else {
            // Respond if the date format is invalid
            await interaction.reply({ content: 'Ongeldige datumnotatie. Gebruik het formaat: DD-MM-YYYY HH:mm', ephemeral: true });
        }
    }
});


// Function to check call appointments and send messages
async function checkCallAppointments() {
    const query = 'SELECT * FROM aanmeldingen WHERE accepted = 2';

    try {
        const results = await new Promise((resolve, reject) => {
            pool.query(query, (error, results, fields) => {
                if (error) {
                    logToChannel(client, "error", error.stack)
                    reject(error, error.stack);
                } else {
                    resolve(results);
                }
            });
        });

        for (let i = 0; i < results.length; i++) {
            if (results[i].discord) {
                const user = results[i];
                const guild = client.guilds.cache.get(process.env.GUILD_ID);
                const channelName = `intake-${user.id}-${user.department.toLowerCase().trim()}`;
                const channel = guild.channels.cache.find(channel => channel.name === channelName);

                if (channel) {
                    // Calculate time difference between now and call appointment time
                    const callAppointmentTime = new Date(user.callAppointment);
                    const currentTime = new Date();
                    const timeDifference = callAppointmentTime - currentTime;

                    // Calculate time difference in minutes
                    const timeDifferenceInMinutes = Math.floor(timeDifference / (1000 * 60));

                    // Check if call appointment is 24 hours away (with a margin of 15 minutes)
                    if (timeDifferenceInMinutes >= (24 * 60 - 15) && timeDifferenceInMinutes <= (24 * 60 + 15)) {
                        if (channel.topic === "0") {
                            const formattedDate = reformatDate(user.callAppointment)
                            const department = user.department.trim()
                            const dayReminderEmbed = new EmbedBuilder()
                                .setTitle(`${process.env.DAY_APPOINTMENT_MESSAGE}${formattedDate}`)
                                .setDescription(`${process.env.DAY_REMINDER_MESSAGE}`)
                            await channel.send({ content: `||<@${user.discord}> <@&${process.env[`${department.toUpperCase()}_ROLE_ID`]}> ||`, embeds: [dayReminderEmbed] });
                            await channel.setTopic('1')
                        }
                    }

                    // Check if call appointment is 30 minutes away (with a margin of 5 minutes)
                    if (timeDifferenceInMinutes >= (30 - 5) && timeDifferenceInMinutes <= (30 + 5)) {
                        if (channel.topic === "0" || channel.topic === "1") {
                            const formattedDate = reformatDate(user.callAppointment)
                            const department = user.department.trim()
                            const halfHourReminderEmbed = new EmbedBuilder()
                                .setTitle(`${process.env.DAY_APPOINTMENT_MESSAGE}${formattedDate}`)
                                .setDescription(`${process.env.HALF_HOUR_REMINDER_MESSAGE}**${timeDifferenceInMinutes}**${process.env.HALF_HOUR_REMINDER_2_MESSAGE}`)
                            await channel.send({ content: `||<@${user.discord}> <@&${process.env[`${department.toUpperCase()}_ROLE_ID`]}> ||`, embeds: [halfHourReminderEmbed] });
                            await channel.setTopic('2')
                        }
                    }
                }
            }
        }
    } catch (error) {
        logToChannel(client, "error", error.stack)
        console.error(error, error.stack);
    }
}
// Run the function every 5 minutes
setInterval(checkCallAppointments, process.env.REMINDER_INTERVAL);


// Function to check call appointments and send messages
async function checkChannelDeletionAndChange() {
    //Accepted people
    const query = 'SELECT * FROM aanmeldingen WHERE accepted = 3';
    try {
        const results = await new Promise((resolve, reject) => {
            pool.query(query, (error, results, fields) => {
                if (error) {
                    logToChannel(client, "error", error.stack)
                    reject(error, error.stack);
                } else {
                    resolve(results);
                }
            });
        });

        for (let i = 0; i < results.length; i++) {
            if (results[i].discord) {
                const user = results[i];
                const guild = client.guilds.cache.get(process.env.GUILD_ID);
                const channelName = `intake-${user.id}-${user.department.toLowerCase().trim()}`;
                const channel = guild.channels.cache.find(channel => channel.name === channelName);

                if (channel) {
                    await channel.send(process.env.AFTER_CALL_MESSAGE)
                    const attachment = await discordTransripts.createTranscript(channel, {
                        limit: -1,
                        returnType: 'attachment',
                        filename: `${channelName}.html`,
                        saveImages: true,
                        footerText: "Exported {number} message{s}",
                        poweredBy: false
                    })
                    logIntaketoChannel(client, `Intake channel (${channelName}, ${channel.name}) for <@${user.discord}> (${user.discord}) automatically deleted, user was accepted.`, [255, 0, 0], attachment)
                    await channel.delete()
                }
            }
        }
    } catch (error) {
        logToChannel(client, "error", error.stack)
        console.error(error, error.stack);
    }

    //Not accepted people
    const query2 = 'SELECT * FROM aanmeldingen WHERE accepted = 4';
    try {
        const results = await new Promise((resolve, reject) => {
            pool.query(query2, (error, results, fields) => {
                if (error) {
                    logToChannel(client, "error", error.stack)
                    reject(error, error.stack);
                } else {
                    resolve(results);
                }
            });
        });

        for (let i = 0; i < results.length; i++) {
            if (results[i].discord) {
                const user = results[i];
                const guild = client.guilds.cache.get(process.env.GUILD_ID);
                const channelName = `intake-${user.id}-${user.department.toLowerCase().trim()}`;
                const channel = guild.channels.cache.find(channel => channel.name === channelName);

                if (channel) {
                    await channel.send(process.env.AFTER_CALL_MESSAGE)
                    const attachment = await discordTransripts.createTranscript(channel, {
                        limit: -1,
                        returnType: 'attachment',
                        filename: `${channelName}.html`,
                        saveImages: true,
                        footerText: "Exported {number} message{s}",
                        poweredBy: false
                    })
                    logIntaketoChannel(client, `Intake channel (${channelName}, ${channel.name}) for <@${user.discord}> (${user.discord}) automatically deleted, user was denied.`, [255, 0, 0], attachment)
                    await channel.delete()
                }
            }
        }
    } catch (error) {
        logToChannel(client, "error", error.stack)
        console.error(error, error.stack);
    }
}
setInterval(checkChannelDeletionAndChange, process.env.DELETION_INTERVAL);


client.login(process.env.DISCORD_TOKEN);