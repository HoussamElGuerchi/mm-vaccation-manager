module.exports.calculDays = (start, end) => {
    startDate = new Date(start);
    endDate = new Date(end);
    return ((endDate.getTime() - startDate.getTime())/(1000 * 3600 * 24))+1;
}