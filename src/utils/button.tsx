import { Button } from "react-bootstrap";
import { Spinner } from "react-bootstrap";

type SpinnerButtonProps = {
    loading: boolean,
    children: React.ReactNode
} & React.ComponentProps<typeof Button>;

export function SpinnerButton({ loading, children, ...props }: SpinnerButtonProps) {
    return (
        <Button disabled={loading} {...props}>
            {loading ? (
                <Spinner as="span"
                animation="border"
                size="sm"
                role="status"
                    style={{ marginRight: "5px" }}
                />
            ) : <></>
            }
            {children}
        </Button>
    );
}

