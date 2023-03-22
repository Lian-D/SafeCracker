d3.csv("data/top_200_password_2020_by_country.csv")
    .then(data => {
        // Perform data processing and derivation

        // Remove Time To Crack attribute as it is redundant
        // Convert number attributes to numbers
        // Derive new attribute "Password Type"
        data.forEach((d) => {
            delete d["Time_to_crack"];
            d["Global_rank"] = +d["Global_rank"];
            d["Rank"] = +d["Rank"];
            d["Time_to_crack_in_seconds"] = +d["Time_to_crack_in_seconds"];
            d["User_count"] = +d["User_count"];
            d["password_type"] = determinePasswordType(d["Password"]);
        });
        console.log(data);
    }).catch((err) => {
        console.log(err);
    });



// Helper and misc functions
/**
 * Function that determines the type of the input password
 * @param {String} password The password 
 * @returns A string that can take on one of three possible values: ALPHABETICAL, NUMERICAL, MIXED
 */
function determinePasswordType(password) {
    let hasLetter = false;
    let hasNumber = false;
    for (let i = 0; i < password.length; i++) {
        let char = password.charAt(i);
        let isNum = Number(char);
        if (isNum) {
            hasNumber = true;
        } else {
            hasLetter = true;
        }
        if (hasLetter && hasNumber) {
            return "MIXED";
        }
    }

    if (hasLetter) {
        return "ALPHABETICAL";
    } else {
        return "NUMERICAL";
    }
}