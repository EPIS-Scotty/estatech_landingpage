(function () {
  const form = document.getElementById("notify-form");
  const feedback = document.getElementById("notify-feedback");

  if (!form || !feedback) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const input = form.querySelector('input[type="email"]');
    const email = input?.value.trim();

    if (!email) {
      showFeedback("Please enter a valid email address.", false);
      return;
    }

    showFeedback("Thanks — we'll be in touch when we're ready.", true);
    form.reset();
  });

  function showFeedback(message, success) {
    feedback.textContent = message;
    feedback.style.color = success ? "var(--estatech-sky)" : "#e8a0a0";
    feedback.classList.add("is-visible");

    window.setTimeout(function () {
      feedback.classList.remove("is-visible");
    }, 5000);
  }
})();
