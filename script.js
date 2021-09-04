'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
    return this.description;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    // this.type = 'running';
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////
// APPLICATION ARCHITECTURE
//Modal
const modal = document.querySelector('.modal');
const overlay = document.querySelector('.overlay');
const btnCloseModal = document.querySelector('.close-modal');
//
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const funcBtn = document.querySelector('.func--btn');
const ability = document.querySelector('.abilities');
const submitBtn = document.querySelector('.form__btn');
const edit = document.getElementById('edit');
const deleteWorkout = document.getElementById('delete');
const sort = document.getElementById('sort');
sort.disabled = true;
const allWiev = document.querySelector('.wiev');
const deleteAll = document.getElementById('delete-all');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let currentWorkout;
let workoutEl;
let curWorkEl;

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  #markers = [];
  #editMode = false;
  constructor() {
    // Get user's position
    this._getPosition();

    //Get data from local stroge
    this._getLocalStroge();

    //Attach event handlers
    // form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toogleElavitonField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    //All Wiev
    allWiev.addEventListener('click', this._boundMap.bind(this));

    // Add New Workout
    submitBtn.addEventListener('click', this._newWorkout.bind(this));

    //Edit Mode
    edit.addEventListener('click', this._editMode.bind(this));

    //Edit Current Workout
    submitBtn.addEventListener('click', this._renderEditWorkout.bind(this));

    //Delete Current Workout
    deleteWorkout.addEventListener('click', this._deleteWorkoutForm.bind(this));

    //Sort Workout by Distance
    sort.addEventListener('click', this._sortWorkout.bind(this));

    // Delete All
    deleteAll.addEventListener('click', this.reset.bind(this));

    // see all marker (bound)
    allWiev.addEventListener('click', this._boundMap.bind(this));
  }

  // Wiev all markers
  _boundMap() {
    const group = new L.featureGroup();
    if (!this.#workouts[0]) {
      this._errMessage();
    } else {
      this.#workouts.forEach(work => L.marker(work.coords).addTo(group));
      this.#map.fitBounds(group.getBounds());
    }
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function (err) {
          alert('Could not get location!');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const location = [latitude, longitude];

    this.#map = L.map('map').setView(location, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
    ability.classList.add('hidebuttons');
    if (!this.#workouts[0]) {
      funcBtn.classList.add('hidebuttons');
    } else funcBtn.classList.remove('hidebuttons');
    if (this.#workouts.length > 0) {
      sort.disabled = false;
    }
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    ability.classList.add('hidebuttons');
    funcBtn.classList.remove('hidebuttons');
    if (!this.#workouts[0]) {
      funcBtn.classList.add('hidebuttons');
    } else funcBtn.classList.remove('hidebuttons');
    if (this.#workouts.length > 0) {
      sort.disabled = false;
    }
  }

  _hideForm() {
    // Empty Inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toogleElavitonField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    if (this.#editMode) return;
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return this._errMessage();

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(duration, distance, elevation) ||
        !allPositive(duration, distance) // elevation negatif olabileceği için eklenmiyor
      )
        return this._errMessage();

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on List
    this._renderWorkout(workout);

    // Hide the form + Clear Input Fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  //Edit Workout
  _renderEditWorkout(e) {
    if (this.#editMode) {
      const validInputs = (...inputs) =>
        inputs.every(inp => Number.isFinite(inp));

      const allPositive = (...inputs) => inputs.every(inp => inp > 0);
      e.preventDefault();

      // Get data from form
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      const [lat, lng] = currentWorkout.coords;
      let workout;
      const index = this.#workouts.indexOf(currentWorkout);
      currentWorkout.type = type;
      currentWorkout.duration = duration;
      currentWorkout.distance = distance;
      // if workout is running, create running object
      if (type === 'running') {
        const cadence = +inputCadence.value;
        // Check if data is valid
        if (
          !validInputs(distance, duration, cadence) ||
          !allPositive(distance, duration, cadence)
        )
          return this._errMessage();

        // currentWorkout.cadence = cadence;
        // currentWorkout.pace = duration / distance;
        currentWorkout = new Running([lat, lng], distance, duration, cadence);
      }

      // if workout is cycling, create cycling object
      if (type === 'cycling') {
        const elevation = +inputElevation.value;
        // Check if data is valid
        if (
          !validInputs(duration, distance, elevation) ||
          !allPositive(duration, distance) // elevation negatif olabileceği için eklenmiyor
        )
          return this._errMessage();

        // currentWorkout.elevationGain = elevation;
        // currentWorkout.speed = distance / (duration / 60);
        currentWorkout = new Cycling([lat, lng], distance, duration, elevation);
      }

      this.#workouts[index] = currentWorkout;
      this._hideForm();
      this._deleteWorkoutMarker(currentWorkout);
      this._renderWorkout(currentWorkout);
      this._renderWorkoutMarker(currentWorkout);
      this.#editMode = false;
    } else return;
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          maxHeight: 200,
          autoClose: false,
          closeOnClick: false,
          closeOnEscapeKey: true,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();
    this.#markers.push(marker);
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
            </div>
          <div class="workout__details">
            <span class="workout__icon">👣</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
      </li>
    `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
          </div>
        <div class="workout__details">
          <span class="workout__icon">🚵‍♀️</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">spm</span>
        </div>
    </li>
    `;
    if (!this.#editMode) {
      form.insertAdjacentHTML('afterend', html);
    } else {
      curWorkEl.outerHTML = html;
    }
  }

  // Move to workout on map coords
  _moveToPopup(e) {
    workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    currentWorkout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    ability.classList.remove('hidebuttons');

    this.#map.setView(currentWorkout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStroge() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    //localstrogeda data olmadığında;
    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
    this._setPrototype();
  }

  //Re-Built Prototype
  _setPrototype() {
    this.#workouts.forEach(work =>
      Object.setPrototypeOf(
        work,
        work.type === 'running' ? Running.prototype : Cycling.prototype
      )
    );
  }

  // Edit-mode
  _editMode() {
    this.#editMode = true;
    curWorkEl = [...containerWorkouts.children].find(
      curWork => currentWorkout.id === curWork.dataset.id
    );
    curWorkEl.style.backgroundColor = 'goldenrod';
    this._showForm();
  }

  //Delete Current Workout
  _deleteWorkoutForm() {
    const current = this.#workouts.find(
      current => current.id === currentWorkout.id
    );
    const index = this.#workouts.indexOf(current);
    this.#workouts.splice(index, 1);
    workoutEl.remove();
    ability.classList.add('hidebuttons');
    if (!this.#workouts[0]) {
      funcBtn.classList.add('hidebuttons');
    }
    this._deleteWorkoutMarker();
  }

  //Delete Current Workout Marker
  _deleteWorkoutMarker() {
    const markerLatLng = this.#markers.find(
      marker =>
        marker._latlng.lat === currentWorkout.coords[0] &&
        marker._latlng.lng === currentWorkout.coords[1]
    );
    const indexmarker = this.#markers.indexOf(markerLatLng);
    this.#map.removeLayer(this.#markers[indexmarker]);
    this.#markers.splice(indexmarker, 1);
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Sort function
  _sortWorkout() {
    if (this.#workouts.length > 1) {
      sort.disabled = false;
      [...containerWorkouts.children].forEach((_, i, arr) =>
        arr[i + 1]?.remove()
      );
      let sortWorkout = this.#workouts.slice();
      sortWorkout.sort((a, b) => a.distance - b.distance);
      this.#workouts = [];
      this.#workouts.push(...sortWorkout);
      for (let i = 0; i < sortWorkout.length; i++) {
        this._renderWorkout(sortWorkout[i]);
      }
    } else sort.disabled = true;
  }

  // Modal
  _errMessage() {
    modal.classList.remove('hidde-modal');
    overlay.classList.remove('hidde-modal');
    const closeModal = function () {
      modal.classList.add('hidde-modal');
      overlay.classList.add('hidde-modal');
    };

    btnCloseModal.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidde-modal'))
        closeModal();
    });
  }
  // Delete All Function
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
