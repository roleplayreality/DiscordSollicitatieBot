
function reformatDate(dateString) {
    const date = new Date(dateString);
    let day = date.getDate();
    let month = date.getMonth() + 1;
    const year = date.getFullYear();
    let hour = date.getHours();
    let minutes = date.getMinutes();

    if (day < 10) day = '0' + day;
    if (month < 10) month = '0' + month;
    if (hour < 10) hour = '0' + hour;
    if (minutes < 10) minutes = '0' + minutes;

    const formattedDateString = day + '-' + month + '-' + year + ' ' + hour + ':' + minutes;

    return formattedDateString;
}

// Function to validate if the parsed date is valid
function isValidDate(dateString) {
    const dateRegex = /^(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2}:\d{2})$/;
    return dateRegex.test(dateString);
}

function convertToSQLDateTime(nlDateTime) {
    // Scheidingsteken bepalen (zowel "-" als "/" worden geaccepteerd)
    const separator = nlDateTime.includes('-') ? '-' : '/';

    // Ongewenste tekens verwijderen en splitsen
    const parts = nlDateTime.split(' ');

    // Datum- en tijdonderdelen ophalen
    const dateParts = parts[0].split(separator);
    const timeParts = parts[1].split(':');

    // Volgorde van datum- en tijdonderdelen bepalen
    const year = dateParts[2];
    const month = dateParts[1];
    const day = dateParts[0];
    const hour = timeParts[0];
    const minute = timeParts[1];
    const second = timeParts[2];
    

    // SQL DATETIME-formaat retourneren
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

module.exports = { isValidDate, reformatDate, convertToSQLDateTime };