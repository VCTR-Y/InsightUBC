import ubcLogo from "../assets/ubc-logo.png";
import { Box, Flex, Button, Image, Stack, HStack, useColorMode, Heading } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

function Header() {
	const { colorMode, toggleColorMode } = useColorMode();

	return (
		// <header>
		// 	<img className="ubclogo" src={ubcLogo}></img>
		// 	<h1>InsightUBC</h1>
		// 	<button>DARK MODE BUTTON</button>
		// </header>
		<>
			<Box px={4} border={"1px solid hsl(0, 0%, 80%)"}>
				<Flex h={16} alignItems={"center"} justifyContent={"space-between"}>
					<HStack>
						<Image src={ubcLogo} alt="UBC Logo" width="50" height="50"/>
						<Heading>InsightUBC</Heading>
					</HStack>
					<Flex alignItems={"center"}>
						<Stack direction={"row"} spacing={7}>
							<Button onClick={toggleColorMode}>{colorMode === "light" ? <MoonIcon /> : <SunIcon />}</Button>
						</Stack>
					</Flex>
				</Flex>
			</Box>
		</>
	);
}

export default Header;
