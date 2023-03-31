let fulldata, chloroplethMap, beeswarm, boxplot, lolipopgraph;
const dispatcher = d3.dispatch(
  'countrySelect',
  'filterPasswordType',
  'selectPass'
);
Promise.all([
  d3.csv('data/top_200_password_2020_by_country.csv'),
  d3.json('data/world-map.geojson'),
])
  .then((data) => {
    // Perform data processing and derivation

    // Remove Time To Crack attribute as it is redundant
    // Convert number attributes to numbers
    // Derive new attribute "Password Type"
    const passworddata = data[0];
    const geoData = data[1];

    fulldata = passworddata;

    passworddata.forEach((d) => {
      delete d['Time_to_crack'];
      d['Global_rank'] = +d['Global_rank'];
      d['Rank'] = +d['Rank'];
      d['Time_to_crack_in_seconds'] = +d['Time_to_crack_in_seconds'];
      d['User_count'] = +d['User_count'];
      d['password_type'] = determinePasswordType(d['Password']);
    });
    let mapData = returnGeoMergeData(geoData, passworddata);
    // console.log(mapData);
    fulldata = passworddata;

    chloroplethMap = new ChloroplethMap(
      {
        parentElement: '#map-container',
      },
      mapData,
      dispatcher
    );

    lolipopgraph = new Lollipop(
      {
        parentElement: '#lollipop-container',
      },
      passworddata,
      dispatcher,
      'Canada'
    );

    beeswarm = new Beeswarm(
      { parentElement: '#beeswarm-container' },
      passworddata.filter((d) => d.country == 'Canada'),
      dispatcher
    );

    boxplot = new Boxplot(
      {
        parentElement: '#boxplot-container',
      },
      passworddata,
      dispatcher
    );
  })
  .catch((err) => {
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
      return 'MIXED';
    }
  }

  if (hasLetter) {
    return 'ALPHABETICAL';
  } else {
    return 'NUMERICAL';
  }
}

/**
 * Function that merges geodata and password data
 * @param {Array} geoData The geojson
 * @param {Array} passwordData The passworddata
 * @returns {Array} of merged values
 */
function returnGeoMergeData(geoData, passwordData) {
  let aggregatedPasswordData = d3.rollups(
    passwordData,
    (v) => d3.mean(v, (d) => d.Time_to_crack_in_seconds),
    (d) => d.country
  );
  // console.log(aggregatedPasswordData);
  geoData.features.forEach((d) => {
    for (let i = 0; i < aggregatedPasswordData.length; i++) {
      if (d.properties.name == aggregatedPasswordData[i][0]) {
        d.properties.code_density = aggregatedPasswordData[i][1];
      }
    }
  });
  return geoData;
}

dispatcher.on('countrySelect', (country) => {
  console.log(country);
  chloroplethMap.selectedCountry = [];
  chloroplethMap.selectedCountry = country;
  chloroplethMap.updateVis();

  lolipopgraph.selectedCountry = [];
  lolipopgraph.selectedCountry = country;
  lolipopgraph.updateVis();
  beeswarm.data = fulldata.filter((d) => d.country == country);
    beeswarm.selectedPasswords = [];
  beeswarm.updateVis();

  boxplot.selectedCountry = country;
  boxplot.updateVis();
});

dispatcher.on('selectPass', (password, add = true) => {
    if (add) {
        beeswarm.selectedPasswords.push(password);
        beeswarm.updateVis();
    } else {
        let ind = beeswarm.selectedPasswords.indexOf(password)
        beeswarm.selectedPasswords.splice(ind,1);
        beeswarm.updateVis();
    }
})

dispatcher.on('filterPasswordType', (passwordType, country) => {
  console.log(passwordType);

  beeswarm.data = fulldata.filter((d) => {
    if (passwordType) {
      return d.country == country && d.password_type == passwordType;
    }
    return d.country == country;
  });
  beeswarm.updateVis();
});

d3.select('#numberselect').on('change', () => {
  console.log('change');

  let rankFilter = d3.select('#numberselect').node().value;

  let filterData = fulldata.filter((d) => {
    return d.Rank <= rankFilter;
  });

  lolipopgraph.data = filterData;
  lolipopgraph.updateVis();
});

window.onscroll = function () {
  myFunction();
};

function myFunction() {
  var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  var height =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;
  var scrolled = (winScroll / height) * 100;
  document.getElementById('myBar').style.width = scrolled + '%';
}
