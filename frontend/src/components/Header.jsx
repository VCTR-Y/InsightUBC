import ubcLogo from "../assets/ubc-logo.png";

function Header() {
	return (
		<header>
			<img className="ubclogo" src={ubcLogo}></img>
			<h1>InsightUBC</h1>
			<button>DARK MODE BUTTON</button>
		</header>
	);
}

export default Header;
